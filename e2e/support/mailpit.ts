import { expect, type APIRequestContext } from '@playwright/test';
import { MAILPIT_URL } from './env';

export interface MailSummary {
  ID: string;
  Subject: string;
  To: { Address: string }[];
  Created: string;
}

/** Klien API Mailpit (https://mailpit.axllent.org/docs/api-v1/). */
export const mailpit = {
  async search(request: APIRequestContext, query: string): Promise<MailSummary[]> {
    const res = await request.get(`${MAILPIT_URL}/api/v1/search`, { params: { query, limit: 50 } });
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as { messages: MailSummary[] };
    return body.messages ?? [];
  },
  async forRecipient(request: APIRequestContext, email: string): Promise<MailSummary[]> {
    return this.search(request, `to:${email}`);
  },
  async text(request: APIRequestContext, id: string): Promise<string> {
    const res = await request.get(`${MAILPIT_URL}/api/v1/message/${id}`);
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as { Text: string; HTML: string };
    return body.Text || body.HTML;
  },
  async deleteAll(request: APIRequestContext): Promise<void> {
    await request.delete(`${MAILPIT_URL}/api/v1/messages`);
  },
  /** Menunggu sampai jumlah email ke penerima mencapai n (atau timeout). */
  async waitForCount(
    request: APIRequestContext,
    email: string,
    n: number,
    timeoutMs = 15_000,
  ): Promise<MailSummary[]> {
    const start = Date.now();
    let last: MailSummary[] = [];
    while (Date.now() - start < timeoutMs) {
      last = await this.forRecipient(request, email);
      if (last.length >= n) return last;
      await new Promise((r) => setTimeout(r, 500));
    }
    return last;
  },
};
