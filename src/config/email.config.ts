import { config } from '@/config/servidor.config';

export const mailConfig = {
  host: config.mail.host,
  port: config.mail.port,
  secure: false,
  auth: {
    user: config.mail.user,
    pass: config.mail.pass,
  },
  from: config.mail.from,
} as const;
