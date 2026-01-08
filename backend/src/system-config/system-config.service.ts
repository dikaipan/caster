import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SystemConfigService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get system config by key
   */
  async getConfig(key: string): Promise<string | null> {
    const config = await this.prisma.systemConfig.findUnique({
      where: { key },
    });
    return config?.value || null;
  }

  /**
   * Get system config by key with default value
   */
  async getConfigWithDefault(key: string, defaultValue: string): Promise<string> {
    const value = await this.getConfig(key);
    return value || defaultValue;
  }

  /**
   * Set system config
   */
  async setConfig(key: string, value: string, description?: string): Promise<void> {
    await this.prisma.systemConfig.upsert({
      where: { key },
      update: {
        value,
        description,
      },
      create: {
        key,
        value,
        description,
      },
    });
  }

  /**
   * Get all configs (for admin)
   */
  async getAllConfigs() {
    return this.prisma.systemConfig.findMany({
      orderBy: { key: 'asc' },
    });
  }
}

