import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import { INQUIRY_RECIPIENT_DEFAULT } from '../api/inquireEmail.ts';

describe('inquiry email integration contract', () => {
  it('documents adubsqz@gmail.com as the inquiry recipient', () => {
    const envExample = readFileSync(resolve(process.cwd(), '.env.example'), 'utf8');
    expect(envExample).toContain(`INQUIRY_RECIPIENT_EMAIL=${INQUIRY_RECIPIENT_DEFAULT}`);
    expect(INQUIRY_RECIPIENT_DEFAULT).toBe('adubsqz@gmail.com');
    expect(envExample).toMatch(/Resend API keys must only live in \.env\.local/);
  });

  it('keeps ABOUT.contactEmail aligned with the inquiry recipient', async () => {
    const { ABOUT } = await import('../src/data.ts');
    expect(ABOUT.contactEmail).toBe('adubsqz@gmail.com');
    expect(ABOUT.contactEmail).toBe(INQUIRY_RECIPIENT_DEFAULT);
  });
});
