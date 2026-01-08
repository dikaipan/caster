import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as speakeasy from 'speakeasy';
import * as qrcode from 'qrcode';
import * as crypto from 'crypto';

@Injectable()
export class TwoFactorAuthService {
    constructor(private readonly configService: ConfigService) { }

    public generateSecret(email: string) {
        const issuer = this.configService.get<string>('TWO_FACTOR_AUTHENTICATION_APP_NAME') || 'Caster';
        const secret = speakeasy.generateSecret({
            name: `${issuer} (${email})`,
            issuer,
        });

        return {
            secret: secret.base32,
            otpauthUrl: secret.otpauth_url,
        };
    }

    public async generateQRCode(otpAuthUrl: string) {
        return qrcode.toDataURL(otpAuthUrl);
    }

    public verifyCode(secret: string, token: string): boolean {
        return speakeasy.totp.verify({
            secret: secret,
            encoding: 'base32',
            token: token,
            window: 1, // Allow 1 step before/after for time drift
        });
    }

    public generateBackupCodes(count = 10): string[] {
        const codes: string[] = [];
        for (let i = 0; i < count; i++) {
            // Generate random bytes and convert to hex, take first 10 chars
            const code = crypto.randomBytes(8).toString('hex').slice(0, 10).toUpperCase();
            // Insert hyphen for readability: XXXXX-XXXXX
            codes.push(`${code.slice(0, 5)}-${code.slice(5)}`);
        }
        return codes;
    }
}
