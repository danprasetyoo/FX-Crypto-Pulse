import nodemailer, { type Transporter } from 'nodemailer';
import { formatMoney } from '@fxpulse/shared';
import type { ActiveAlert } from './alerts.repo';
import { describeCondition } from './evaluate';
import type { WorkerConfig } from './config';

export interface Mailer {
  sendAlert(alert: ActiveAlert, price: number, updatedAt: string): Promise<void>;
}

export function assetLabel(alert: ActiveAlert): string {
  return alert.type === 'fx' ? `${alert.assetCode} / IDR` : alert.assetCode;
}

export function buildAlertMail(
  alert: ActiveAlert,
  price: number,
  updatedAt: string,
  appBaseUrl: string,
) {
  const label = assetLabel(alert);
  const target = formatMoney(alert.target, alert.currency);
  const current = formatMoney(price, alert.currency);
  const subject = `Alert harga: ${label} ${describeCondition(alert.condition)} ${target}`;
  const text = [
    `Alert harga Anda terpenuhi.`,
    ``,
    `Aset: ${label}`,
    `Kondisi: ${describeCondition(alert.condition)} ${target}`,
    `Harga saat ini: ${current}`,
    `Waktu data: ${updatedAt}`,
    ``,
    `Alert ini sekarang nonaktif. Aktifkan kembali di ${appBaseUrl}/alerts jika diperlukan.`,
    ``,
    `Data hanya informasi, bukan saran investasi.`,
  ].join('\n');
  return { subject, text };
}

export class SmtpMailer implements Mailer {
  private readonly transporter: Transporter;

  constructor(private readonly config: WorkerConfig) {
    this.transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
      connectionTimeout: 10_000,
    });
  }

  async sendAlert(alert: ActiveAlert, price: number, updatedAt: string): Promise<void> {
    const { subject, text } = buildAlertMail(alert, price, updatedAt, this.config.appBaseUrl);
    await this.transporter.sendMail({
      from: this.config.smtp.from,
      to: alert.email,
      subject,
      text,
      headers: { 'X-FXPulse-Alert-Id': alert.id, 'X-FXPulse-Activation': String(alert.activation) },
    });
  }
}
