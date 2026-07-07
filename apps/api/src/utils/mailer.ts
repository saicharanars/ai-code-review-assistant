import nodemailer from 'nodemailer';
import 'dotenv/config';
import { config } from '../config/index';

export const mailer = nodemailer.createTransport({
  host: config.smtpServer,
  port: config.smtpPort,
  secure: false,
  auth: {
    user: config.smtpLogin,
    pass: config.smtpKey,
  },
});
