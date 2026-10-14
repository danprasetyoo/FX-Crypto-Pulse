import { Inject, Injectable, Logger } from '@nestjs/common';
import nodemailer, { type Transporter } from 'nodemailer';
import { CONFIG, type UserConfig } from '../config';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/** Pengirim email lewat SMTP (dev: Mailpit). */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter;
  private readonly from: string;

  constructor(@Inject(CONFIG) config: UserConfig) {
    this.from = config.smtp.from;
    this.transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
      connectionTimeout: 10_000,
    });
  }

  async send(msg: MailMessage): Promise<void> {
    await this.transporter.sendMail({ from: this.from, ...msg });
    this.logger.log(`Email terkirim ke ${msg.to}: ${msg.subject}`);
  }
}
