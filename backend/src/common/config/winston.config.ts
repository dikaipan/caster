import { utilities as nestWinstonModuleUtilities } from 'nest-winston';
import * as winston from 'winston';
import 'winston-daily-rotate-file';

export const winstonConfig = {
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                // Sensitive data redaction
                winston.format((info) => {
                    const sensitiveKeys = ['password', 'token', 'refresh_token', 'access_token', 'secret', 'authorization', 'cookie'];

                    const redact = (obj: any) => {
                        if (typeof obj !== 'object' || obj === null) return obj;
                        if (Array.isArray(obj)) return obj.map(redact);

                        const newObj = { ...obj };
                        for (const key in newObj) {
                            if (sensitiveKeys.some(s => key.toLowerCase().includes(s))) {
                                newObj[key] = '[REDACTED]';
                            } else if (typeof newObj[key] === 'object') {
                                newObj[key] = redact(newObj[key]);
                            }
                        }
                        return newObj;
                    };

                    if (typeof info.message === 'object') {
                        info.message = JSON.stringify(redact(info.message), null, 2);
                    }
                    if (typeof info.context === 'object') {
                        info.context = JSON.stringify(redact(info.context), null, 2);
                    }

                    return info;
                })(),
                winston.format.timestamp(),
                winston.format.ms(),
                nestWinstonModuleUtilities.format.nestLike('HCM-Backend', {
                    colors: true,
                    prettyPrint: true,
                }),
            ),
        }),
        new winston.transports.DailyRotateFile({
            filename: 'logs/error-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '14d',
            level: 'error',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json(),
            ),
        }),
        new winston.transports.DailyRotateFile({
            filename: 'logs/combined-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '14d',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json(),
            ),
        }),
    ],
};
