import { Injectable, UnauthorizedException, ConflictException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateHitachiUserDto } from './dto/create-hitachi-user.dto';
import { UpdateHitachiUserDto } from './dto/update-hitachi-user.dto';
import { CreateBankUserDto } from './dto/create-bank-user.dto';
import { UpdateBankUserDto } from './dto/update-bank-user.dto';
import { BCRYPT_SALT_ROUNDS } from './constants';
import { TwoFactorAuthService } from './two-factor-auth.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private twoFactorAuthService: TwoFactorAuthService,
  ) { }

  async getProfile(userId: string, userType: string) {
    let user;
    if (userType === 'HITACHI') {
      user = await this.prisma.hitachiUser.findUnique({ where: { id: userId } });
    } else if (userType === 'PENGELOLA') {
      user = await this.prisma.pengelolaUser.findUnique({ where: { id: userId } });
    } else if (userType === 'BANK') {
      user = await this.prisma.bankUser.findUnique({ where: { id: userId } });
    } else {
      throw new NotFoundException('Invalid user type');
    }

    if (!user) throw new NotFoundException('User not found');

    const { password, passwordHash, twoFactorSecret, ...result } = user;

    // Explicitly cast or add field if not in type
    const response = {
      ...result,
      userType,
      twoFactorEnabled: !!user.twoFactorEnabled, // Ensure boolean
    };

    return response;
  }

  async validateUser(username: string, password: string): Promise<any> {
    // Try to find in hitachi_users
    const hitachiUser = await this.prisma.hitachiUser.findUnique({
      where: { username },
    });

    if (hitachiUser) {
      const isPasswordValid = await bcrypt.compare(password, hitachiUser.passwordHash);
      if (isPasswordValid && hitachiUser.status === 'ACTIVE') {
        const { passwordHash, ...result } = hitachiUser;
        return {
          ...result,
          userType: 'HITACHI',
        };
      }
    }

    // Try to find in pengelola_users
    const pengelolaUser = await this.prisma.pengelolaUser.findUnique({
      where: { username },
      include: { pengelola: true },
    });

    if (pengelolaUser) {
      const isPasswordValid = await bcrypt.compare(password, pengelolaUser.passwordHash);
      if (isPasswordValid && pengelolaUser.status === 'ACTIVE') {
        const { passwordHash, ...result } = pengelolaUser;
        return {
          ...result,
          userType: 'PENGELOLA',
          pengelolaId: pengelolaUser.pengelolaId,
        };
      }
    }

    // Try to find in bank_users
    const bankUser = await this.prisma.bankUser.findUnique({
      where: { username },
      include: { customerBank: true },
    });

    if (bankUser) {
      const isPasswordValid = await bcrypt.compare(password, bankUser.passwordHash);
      if (isPasswordValid && bankUser.status === 'ACTIVE') {
        const { passwordHash, ...result } = bankUser;
        return {
          ...result,
          userType: 'BANK',
          customerBankId: bankUser.customerBankId,
        };
      }
    }

    throw new UnauthorizedException('Invalid credentials');
  }

  async login(user: any) {
    // Check if 2FA is enabled
    if (user.twoFactorEnabled) {
      return {
        twoFactorRequired: true,
        userId: user.id,
        userType: user.userType,
        tempToken: this.jwtService.sign(
          {
            sub: user.id,
            userType: user.userType,
            isTwoFactorTemp: true
          },
          { expiresIn: '5m' }
        ),
      };
    }

    return this.generateTokens(user);
  }

  async verifyLogin2FA(tempToken: string, code: string) {
    try {
      const payload = this.jwtService.verify(tempToken);
      if (!payload.isTwoFactorTemp) {
        throw new UnauthorizedException('Invalid token type');
      }

      const userId = payload.sub;
      const userType = payload.userType;

      let user;

      if (userType === 'HITACHI') {
        user = await this.prisma.hitachiUser.findUnique({ where: { id: userId } });
      } else if (userType === 'PENGELOLA') {
        user = await this.prisma.pengelolaUser.findUnique({ where: { id: userId } });
      } else if (userType === 'BANK') {
        user = await this.prisma.bankUser.findUnique({ where: { id: userId } });
      } else {
        throw new UnauthorizedException('Invalid user type');
      }

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      if (!user.twoFactorEnabled || !user.twoFactorSecret) {
        throw new UnauthorizedException('2FA is not enabled for this user');
      }

      const isValid = this.twoFactorAuthService.verifyCode(user.twoFactorSecret, code);
      if (!isValid) {
        throw new UnauthorizedException('Invalid authentication code');
      }

      const userForToken: any = { ...user, userType };
      if (userType === 'PENGELOLA') {
        userForToken.pengelolaId = (user as any).pengelolaId;
      } else if (userType === 'BANK') {
        userForToken.customerBankId = (user as any).customerBankId;
      }

      return this.generateTokens(userForToken);

    } catch (e) {
      console.log(e);
      throw new UnauthorizedException('Invalid or expired 2FA session');
    }
  }

  async setup2FA(userId: string, userType: string) {
    let user;
    if (userType === 'HITACHI') {
      user = await this.prisma.hitachiUser.findUnique({ where: { id: userId } });
    } else if (userType === 'PENGELOLA') {
      user = await this.prisma.pengelolaUser.findUnique({ where: { id: userId } });
    } else if (userType === 'BANK') {
      user = await this.prisma.bankUser.findUnique({ where: { id: userId } });
    } else {
      throw new NotFoundException('Invalid user type');
    }

    if (!user) throw new NotFoundException('User not found');

    const { secret, otpauthUrl } = this.twoFactorAuthService.generateSecret(user.email);
    const qrCode = await this.twoFactorAuthService.generateQRCode(otpauthUrl || '');

    const updateData: any = { twoFactorSecret: secret };

    if (userType === 'HITACHI') {
      await this.prisma.hitachiUser.update({ where: { id: userId }, data: updateData });
    } else if (userType === 'PENGELOLA') {
      await this.prisma.pengelolaUser.update({ where: { id: userId }, data: updateData });
    } else if (userType === 'BANK') {
      await this.prisma.bankUser.update({ where: { id: userId }, data: updateData });
    }

    return { secret, qrCode };
  }

  async verifySetup(userId: string, userType: string, code: string) {
    let user;
    if (userType === 'HITACHI') {
      user = await this.prisma.hitachiUser.findUnique({ where: { id: userId } });
    } else if (userType === 'PENGELOLA') {
      user = await this.prisma.pengelolaUser.findUnique({ where: { id: userId } });
    } else if (userType === 'BANK') {
      user = await this.prisma.bankUser.findUnique({ where: { id: userId } });
    } else {
      throw new NotFoundException('Invalid user type');
    }

    if (!user) throw new NotFoundException('User not found');
    if (!user.twoFactorSecret) throw new ConflictException('2FA setup not initiated');

    const isValid = this.twoFactorAuthService.verifyCode(user.twoFactorSecret, code);
    if (!isValid) throw new UnauthorizedException('Invalid authentication code');

    const backupCodes = this.twoFactorAuthService.generateBackupCodes();
    const updateData: any = {
      twoFactorEnabled: true,
      twoFactorBackupCodes: JSON.stringify(backupCodes),
    };

    let updatedUser;
    if (userType === 'HITACHI') {
      updatedUser = await this.prisma.hitachiUser.update({ where: { id: userId }, data: updateData });
    } else if (userType === 'PENGELOLA') {
      updatedUser = await this.prisma.pengelolaUser.update({ where: { id: userId }, data: updateData });
    } else if (userType === 'BANK') {
      updatedUser = await this.prisma.bankUser.update({ where: { id: userId }, data: updateData });
    }

    // Sanitize user before returning
    const { password, twoFactorSecret, ...safeUser } = updatedUser;

    return { backupCodes, user: safeUser };
  }

  async disable2FA(userId: string, userType: string) {
    const updateData: any = {
      twoFactorEnabled: false,
      twoFactorSecret: null,
      twoFactorBackupCodes: null,
    };

    let updatedUser;
    if (userType === 'HITACHI') {
      updatedUser = await this.prisma.hitachiUser.update({ where: { id: userId }, data: updateData });
    } else if (userType === 'PENGELOLA') {
      updatedUser = await this.prisma.pengelolaUser.update({ where: { id: userId }, data: updateData });
    } else if (userType === 'BANK') {
      updatedUser = await this.prisma.bankUser.update({ where: { id: userId }, data: updateData });
    } else {
      throw new NotFoundException('Invalid user type');
    }

    // Sanitize user before returning
    const { password, twoFactorSecret, ...safeUser } = updatedUser;

    return { message: '2FA disabled successfully', user: safeUser };
  }

  private async generateTokens(user: any) {
    const payload = {
      sub: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      userType: user.userType,
      pengelolaId: user.pengelolaId || null,
      customerBankId: user.customerBankId || null,
      department: user.department || null, // PengelolaUser and BankUser don't have department
    };

    const accessToken = this.jwtService.sign(payload);

    const refreshTokenValue = crypto.randomBytes(64).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: {
        token: refreshTokenValue,
        userId: user.id,
        userType: user.userType,
        expiresAt,
      },
    });

    const oldTokens = await this.prisma.refreshToken.findMany({
      where: {
        userId: user.id,
        userType: user.userType,
        revoked: false,
      },
      orderBy: { createdAt: 'desc' },
      skip: 4,
    });

    if (oldTokens.length > 0) {
      await this.prisma.refreshToken.updateMany({
        where: {
          id: { in: oldTokens.map(t => t.id) },
        },
        data: { revoked: true, revokedAt: new Date() },
      });
    }

    // Update last login
    if (user.userType === 'HITACHI') {
      await this.prisma.hitachiUser.update({
        where: { id: user.id },
        data: { lastLogin: new Date() },
      });
    } else if (user.userType === 'PENGELOLA') {
      await this.prisma.pengelolaUser.update({
        where: { id: user.id },
        data: { lastLogin: new Date() },
      });
    } else if (user.userType === 'BANK') {
      await this.prisma.bankUser.update({
        where: { id: user.id },
        data: { lastLogin: new Date() },
      });
    }

    return {
      tokens: {
        access_token: accessToken,
        refresh_token: refreshTokenValue,
      },
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        userType: user.userType,
        pengelolaId: user.pengelolaId || null,
        customerBankId: user.customerBankId || null,
        department: user.department || null, // PengelolaUser and BankUser don't have department
      },
    };
  }

  async refreshToken(refreshToken: string) {
    const tokenRecord = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });

    if (!tokenRecord) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (tokenRecord.revoked) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    if (tokenRecord.expiresAt < new Date()) {
      await this.prisma.refreshToken.update({
        where: { id: tokenRecord.id },
        data: {
          revoked: true,
          revokedAt: new Date(),
        },
      });
      throw new UnauthorizedException('Refresh token has expired');
    }

    let user: any;
    if (tokenRecord.userType === 'HITACHI') {
      user = await this.prisma.hitachiUser.findUnique({
        where: { id: tokenRecord.userId },
      });
    } else if (tokenRecord.userType === 'PENGELOLA') {
      user = await this.prisma.pengelolaUser.findUnique({
        where: { id: tokenRecord.userId },
        include: { pengelola: true },
      });
    } else if (tokenRecord.userType === 'BANK') {
      user = await this.prisma.bankUser.findUnique({
        where: { id: tokenRecord.userId },
        include: { customerBank: true },
      });
    } else {
      throw new UnauthorizedException('Invalid user type');
    }

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User not found or inactive');
    }

    const payload = {
      sub: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      userType: tokenRecord.userType,
      pengelolaId: tokenRecord.userType === 'PENGELOLA' ? user.pengelolaId : undefined,
      customerBankId: tokenRecord.userType === 'BANK' ? user.customerBankId : undefined,
      department: tokenRecord.userType === 'HITACHI' ? user.department : undefined,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      access_token: accessToken,
      refresh_token: refreshToken, // Return existing refresh token (rotating scheme can be implemented later)
    };
  }

  async logout(refreshToken: string) {
    const tokenRecord = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });

    if (tokenRecord && !tokenRecord.revoked) {
      await this.prisma.refreshToken.update({
        where: { id: tokenRecord.id },
        data: {
          revoked: true,
          revokedAt: new Date(),
        },
      });
    }

    return { message: 'Logged out successfully' };
  }

  async revokeAllUserTokens(userId: string, userType: string) {
    await this.prisma.refreshToken.updateMany({
      where: {
        userId,
        userType,
        revoked: false,
      },
      data: {
        revoked: true,
        revokedAt: new Date(),
      },
    });
  }



  async createHitachiUser(createUserDto: CreateHitachiUserDto) {
    const existingUser = await this.prisma.hitachiUser.findFirst({
      where: {
        OR: [
          { username: createUserDto.username },
          { email: createUserDto.email },
        ],
      },
    });

    if (existingUser) {
      throw new ConflictException('Username or email already exists');
    }

    const passwordHash = await bcrypt.hash(createUserDto.password, BCRYPT_SALT_ROUNDS);

    return this.prisma.hitachiUser.create({
      data: {
        username: createUserDto.username,
        email: createUserDto.email,
        passwordHash,
        fullName: createUserDto.fullName,
        role: createUserDto.role,
        department: createUserDto.department,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        department: true,
        status: true,
        createdAt: true,
      },
    });
  }

  async getAllHitachiUsers() {
    return this.prisma.hitachiUser.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        department: true,
        status: true,
        lastLogin: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async updateHitachiUser(userId: string, updateUserDto: UpdateHitachiUserDto) {
    const user = await this.prisma.hitachiUser.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (updateUserDto.username || updateUserDto.email) {
      const existingUser = await this.prisma.hitachiUser.findFirst({
        where: {
          AND: [
            { id: { not: userId } },
            {
              OR: [
                updateUserDto.username ? { username: updateUserDto.username } : {},
                updateUserDto.email ? { email: updateUserDto.email } : {},
              ],
            },
          ],
        },
      });

      if (existingUser) {
        throw new ConflictException('Username or email already exists');
      }
    }

    const updateData: any = { ...updateUserDto };

    if (updateUserDto.password) {
      updateData.passwordHash = await bcrypt.hash(updateUserDto.password, BCRYPT_SALT_ROUNDS);
      delete updateData.password;
    }

    return this.prisma.hitachiUser.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        department: true,
        status: true,
        createdAt: true,
      },
    });
  }

  async deleteHitachiUser(userId: string) {
    const user = await this.prisma.hitachiUser.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.hitachiUser.delete({
      where: { id: userId },
    });

    return { message: 'User deleted successfully' };
  }

  // Additional Hitachi User methods
  async getHitachiUserById(userId: string) {
    const user = await this.prisma.hitachiUser.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        department: true,
        status: true,
        lastLogin: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async changeHitachiUserPassword(userId: string, newPassword: string) {
    const user = await this.prisma.hitachiUser.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);

    await this.prisma.hitachiUser.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return { message: 'Password changed successfully' };
  }

  async deactivateHitachiUser(userId: string) {
    const user = await this.prisma.hitachiUser.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.hitachiUser.update({
      where: { id: userId },
      data: { status: 'INACTIVE' },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        department: true,
        status: true,
        createdAt: true,
      },
    });
  }

  async activateHitachiUser(userId: string) {
    const user = await this.prisma.hitachiUser.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.hitachiUser.update({
      where: { id: userId },
      data: { status: 'ACTIVE' },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        department: true,
        status: true,
        createdAt: true,
      },
    });
  }

  // Pengelola User methods
  async createPengelolaUser(createUserDto: any) {
    const existingUser = await this.prisma.pengelolaUser.findFirst({
      where: {
        OR: [
          { username: createUserDto.username },
          { email: createUserDto.email },
        ],
      },
    });

    if (existingUser) {
      throw new ConflictException('Username or email already exists');
    }

    // Validate pengelolaId is provided
    if (!createUserDto.pengelolaId) {
      throw new ConflictException('pengelolaId is required for Pengelola users');
    }

    const passwordHash = await bcrypt.hash(createUserDto.password, BCRYPT_SALT_ROUNDS);

    return this.prisma.pengelolaUser.create({
      data: {
        username: createUserDto.username,
        email: createUserDto.email,
        passwordHash,
        fullName: createUserDto.fullName,
        role: createUserDto.role || 'SUPERVISOR',
        pengelolaId: createUserDto.pengelolaId,
        canCreateTickets: createUserDto.canCreateTickets ?? true,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        pengelolaId: true,
        canCreateTickets: true,
        status: true,
        createdAt: true,
      },
    });
  }

  async getPengelolaUserById(userId: string) {
    const user = await this.prisma.pengelolaUser.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        pengelolaId: true,
        canCreateTickets: true,
        status: true,
        lastLogin: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updatePengelolaUser(userId: string, updateUserDto: any) {
    const user = await this.prisma.pengelolaUser.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (updateUserDto.username || updateUserDto.email) {
      const existingUser = await this.prisma.pengelolaUser.findFirst({
        where: {
          AND: [
            { id: { not: userId } },
            {
              OR: [
                updateUserDto.username ? { username: updateUserDto.username } : {},
                updateUserDto.email ? { email: updateUserDto.email } : {},
              ],
            },
          ],
        },
      });

      if (existingUser) {
        throw new ConflictException('Username or email already exists');
      }
    }

    const updateData: any = { ...updateUserDto };

    if (updateUserDto.password) {
      updateData.passwordHash = await bcrypt.hash(updateUserDto.password, BCRYPT_SALT_ROUNDS);
      delete updateData.password;
    }

    return this.prisma.pengelolaUser.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        pengelolaId: true,
        canCreateTickets: true,
        status: true,
        createdAt: true,
      },
    });
  }

  async deletePengelolaUser(userId: string) {
    const user = await this.prisma.pengelolaUser.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.pengelolaUser.delete({
      where: { id: userId },
    });

    return { message: 'User deleted successfully' };
  }

  // Bank User methods
  async createBankUser(createUserDto: CreateBankUserDto) {
    const existingUser = await this.prisma.bankUser.findFirst({
      where: {
        OR: [
          { username: createUserDto.username },
          { email: createUserDto.email },
        ],
      },
    });

    if (existingUser) {
      throw new ConflictException('Username or email already exists');
    }

    // Verify customerBankId exists
    const bank = await this.prisma.customerBank.findUnique({
      where: { id: createUserDto.customerBankId },
    });

    if (!bank) {
      throw new NotFoundException('Customer bank not found');
    }

    const passwordHash = await bcrypt.hash(createUserDto.password, BCRYPT_SALT_ROUNDS);

    return this.prisma.bankUser.create({
      data: {
        username: createUserDto.username,
        email: createUserDto.email,
        passwordHash,
        fullName: createUserDto.fullName,
        phone: createUserDto.phone,
        role: createUserDto.role || 'VIEWER',
        customerBankId: createUserDto.customerBankId,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        customerBankId: true,
        status: true,
        lastLogin: true,
        createdAt: true,
      },
    });
  }

  async getAllBankUsers(bankId?: string) {
    const where: any = {};
    if (bankId) {
      where.customerBankId = bankId;
    }

    return this.prisma.bankUser.findMany({
      where,
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        customerBankId: true,
        status: true,
        lastLogin: true,
        createdAt: true,
        customerBank: {
          select: {
            id: true,
            bankName: true,
            bankCode: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getBankUserById(userId: string) {
    const user = await this.prisma.bankUser.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        customerBankId: true,
        status: true,
        lastLogin: true,
        createdAt: true,
        customerBank: {
          select: {
            id: true,
            bankName: true,
            bankCode: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateBankUser(userId: string, updateUserDto: UpdateBankUserDto) {
    const user = await this.prisma.bankUser.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (updateUserDto.username || updateUserDto.email) {
      const existingUser = await this.prisma.bankUser.findFirst({
        where: {
          AND: [
            { id: { not: userId } },
            {
              OR: [
                updateUserDto.username ? { username: updateUserDto.username } : {},
                updateUserDto.email ? { email: updateUserDto.email } : {},
              ],
            },
          ],
        },
      });

      if (existingUser) {
        throw new ConflictException('Username or email already exists');
      }
    }

    const updateData: any = { ...updateUserDto };

    if (updateUserDto.password) {
      updateData.passwordHash = await bcrypt.hash(updateUserDto.password, BCRYPT_SALT_ROUNDS);
      delete updateData.password;
    }

    return this.prisma.bankUser.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        customerBankId: true,
        status: true,
        lastLogin: true,
        createdAt: true,
      },
    });
  }

  async deleteBankUser(userId: string) {
    const user = await this.prisma.bankUser.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.bankUser.delete({
      where: { id: userId },
    });

    return { message: 'User deleted successfully' };
  }
}

