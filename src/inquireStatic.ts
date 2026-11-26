import { ABOUT } from './data';
import type { Photo } from './types';

export type InquirePayload = {
  photo: Photo;
  name: string;
  email: string;
  company: string;
  shippingAddress: string;
  size: string;
  printMedium: string;
  printFinish: string;
  notes: string;
  inquiryCode?: string;
};

export type ContactPayload = {
  name: string;
  email: string;
  subject: string;
  message: string;
  inquiryCode?: string;
};

export function contactPrefillForPhoto(photo: Pick<Photo, 'id' | 'alt'>): { subject: string; message: string } {
  const label = photo.alt?.trim() || photo.id;
  return {
    subject: `About ${label}`,
    message: `I'd like to talk about this still: ${label} (${photo.id}).`,
  };
}

const INQUIRY_CODE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

export function newInquiryCode(): string {
  const bytes = new Uint8Array(9);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => INQUIRY_CODE_CHARS[b % INQUIRY_CODE_CHARS.length]!).join('');
}

/** After send, tell the visitor to look in *their* inbox — not the studio recipient. */
export function sentConfirmationHint(visitorEmail: string): string {
  const inbox = visitorEmail.trim();
  if (!inbox) {
    return 'Check your inbox (and spam). If nothing arrives, Send again and your mail app will open.';
  }
  return `Check ${inbox} (and spam). If nothing arrives, Send again and your mail app will open.`;
}

function bodyText(p: InquirePayload, inquiryCode: string): string {
  return [
    `Inquiry #: ${inquiryCode}`,
    `From: ${p.name} (${p.email})`,
    p.company ? `Company: ${p.company}` : '',
    `Photo: ${p.photo.id}`,
    `Src: ${p.photo.src}`,
    `Size: ${p.size}`,
    `Medium: ${p.printMedium}`,
    `Finish: ${p.printFinish}`,
    `Ship to: ${p.shippingAddress}`,
    p.notes ? `Notes: ${p.notes}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

function inbox(): string {
  return ABOUT.contactEmail;
}

function mailtoHref(subject: string, body: string): string {
  return `mailto:${inbox()}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function remoteSucceeded(res: Response, data: unknown): boolean {
  if (!res.ok) return false;
  if (!data || typeof data !== 'object') return false;
  const success = (data as { success?: unknown }).success;
  return success === true || success === 'true';
}

/** Web3Forms. Access key is meant for the browser; free tier has no sponsor ads. */
async function web3forms(
  accessKey: string,
  name: string,
  email: string,
  subject: string,
  message: string,
  inquiryCode: string,
): Promise<boolean> {
  const res = await fetch('https://api.web3forms.com/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      access_key: accessKey,
      subject: `${subject} [${inquiryCode}]`,
      from_name: name,
      email,
      inquiry_number: inquiryCode,
      message,
    }),
  });
  const data: unknown = await res.json().catch(() => null);
  return remoteSucceeded(res, data);
}

async function tryRemoteSubmit(
  name: string,
  email: string,
  subject: string,
  message: string,
  inquiryCode: string,
): Promise<boolean> {
  const web3 = import.meta.env.VITE_WEB3FORMS_ACCESS_KEY?.trim();
  if (!web3) return false;
  try {
    if (await web3forms(web3, name, email, subject, message, inquiryCode)) return true;
  } catch {
    // Fall through to mailto so a static host never eats a sale.
  }
  return false;
}

function assignMailto(subject: string, body: string): void {
  window.location.href = mailtoHref(subject, body);
}

export async function submitContactMessage(p: ContactPayload): Promise<void> {
  const inquiryCode = p.inquiryCode ?? newInquiryCode();
  const body = `Inquiry #: ${inquiryCode}\nFrom: ${p.name} (${p.email})\n\n${p.message}`;
  if (await tryRemoteSubmit(p.name, p.email, p.subject, body, inquiryCode)) return;
  assignMailto(`${p.subject} [${inquiryCode}]`, body);
}

export async function submitPrintInquiry(p: InquirePayload): Promise<void> {
  const inquiryCode = p.inquiryCode ?? newInquiryCode();
  const subject = `Print inquiry: ${p.photo.alt || p.photo.id}`;
  const body = bodyText(p, inquiryCode);
  if (await tryRemoteSubmit(p.name, p.email, subject, body, inquiryCode)) return;
  assignMailto(`${subject} [${inquiryCode}]`, body);
}
