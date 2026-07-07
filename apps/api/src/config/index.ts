// config.ts
import { getEnvVar, getNumberEnvVar } from "../utils/utils";

export const config = {
  jwtSecret: getEnvVar('JWT_SECRET_KEY'),
  apiUrl: getEnvVar('API_URL'),
  appUrl: getEnvVar('APP_URL'),
  smtpMailId: getEnvVar('SMTP_MAIL_ID'),
  smtpServer: getEnvVar('SMTP_SERVER'),
  smtpPort: getNumberEnvVar('SMTP_PORT'),
  smtpLogin: getEnvVar('SMTP_LOGIN'),
  smtpKey: getEnvVar('SMTP_KEY'),
  databaseUrl: getEnvVar('DATABASE_URL'),
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV !== 'production',
} as const;

export type Config = typeof config;