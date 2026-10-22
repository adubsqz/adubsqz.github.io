import { ABOUT } from './data';
import type { Photo } from './types';

/** FormSubmit hash from the activation email — required after confirm, not the naked inbox. */
export const FORMSUBMIT_FORM_ID = '9e5f95e3027a5d9d5fd6e84de3e2ebf4';

export const LOOKBOOK_ACCESS_SUBJECT = 'Lookbook access / print inquiry';

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

export type InquiryResult = {
  ok: boolean;
  statusMessage: string;
  mailtoFallbackUrl: string;
  inquiryCode: string;
};

export type SubmitInquiryOptions = {
  /** When false, skip `window.location = mailto:` so the UI can show the link. Default true. */
  openMailtoOnFailure?: boolean;
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

export function confirmationAutoresponse(name: string, code: string): string {
  return `Hi ${name}, we received your message. Your inquiry number is ${code}. Keep this code to track the conversation. — adubsqz`;
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

export function formsubmitEndpoint(): string {
  const id = import.meta.env.VITE_FORMSUBMIT_ID?.trim();
  if (id) return id;
  const email = import.meta.env.VITE_FORMSUBMIT_EMAIL?.trim();
  if (email) return email;
  return FORMSUBMIT_FORM_ID;
}

function formsubmitAjaxUrl(endpoint: string): string {
  const slug = endpoint.includes('@') ? encodeURIComponent(endpoint) : endpoint;
  return `https://formsubmit.co/ajax/${slug}`;
}

export function mailtoHref(subject: string, body: string): string {
  return `mailto:${inbox()}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/**
 * FormSubmit returns HTTP 200 with `{ success: "false", message: "…" }` when the
 * form is unactivated — a bare `response.ok` check would treat that as success.
 */
function remoteSucceeded(res: Response, data: unknown): boolean {
  if (!res.ok) return false;
  if (!data || typeof data !== 'object') return false;
  const success = (data as { success?: unknown }).success;
  if (success === false || success === 'false') return false;
  return success === true || success === 'true';
}

/** FormSubmit AJAX. After activation, POST to the hash — email URLs stop delivering. */
async function formsubmit(
  to: string,
  name: string,
  email: string,
  subject: string,
  message: string,
  inquiryCode: string,
): Promise<boolean> {
  const res = await fetch(formsubmitAjaxUrl(to), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      name,
      email,
      inquiry_number: inquiryCode,
      _replyto: email,
      _subject: `${subject} [${inquiryCode}]`,
      _captcha: 'false',
      _autoresponse: confirmationAutoresponse(name, inquiryCode),
      message,
    }),
  });
  const data: unknown = await res.json().catch(() => null);
  return remoteSucceeded(res, data);
}

/** Web3Forms. Access key is meant for the browser. */
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
  try {
    if (web3) {
      if (await web3forms(web3, name, email, subject, message, inquiryCode)) return true;
    } else {
      const to = formsubmitEndpoint();
      if (to && (await formsubmit(to, name, email, subject, message, inquiryCode))) return true;
    }
  } catch {
    // Fall through to mailto so a static host never eats a sale.
  }
  return false;
}

function assignMailto(subject: string, body: string): void {
  window.location.href = mailtoHref(subject, body);
}

function successResult(inquiryCode: string, mailtoFallbackUrl: string): InquiryResult {
  return {
    ok: true,
    statusMessage: sentConfirmationHint(''),
    mailtoFallbackUrl,
    inquiryCode,
  };
}

function failureResult(
  inquiryCode: string,
  subject: string,
  body: string,
  openMailtoOnFailure: boolean,
  statusMessage: string,
): InquiryResult {
  const mailtoFallbackUrl = mailtoHref(subject, body);
  if (openMailtoOnFailure) assignMailto(subject, body);
  return {
    ok: false,
    statusMessage,
    mailtoFallbackUrl,
    inquiryCode,
  };
}

export async function submitContactMessage(
  p: ContactPayload,
  options: SubmitInquiryOptions = {},
): Promise<InquiryResult> {
  const openMailtoOnFailure = options.openMailtoOnFailure !== false;
  const inquiryCode = p.inquiryCode ?? newInquiryCode();
  const body = `Inquiry #: ${inquiryCode}\nFrom: ${p.name} (${p.email})\n\n${p.message}`;
  const subjectWithCode = `${p.subject} [${inquiryCode}]`;
  const mailtoFallbackUrl = mailtoHref(subjectWithCode, body);

  if (await tryRemoteSubmit(p.name, p.email, p.subject, body, inquiryCode)) {
    return {
      ...successResult(inquiryCode, mailtoFallbackUrl),
      statusMessage: sentConfirmationHint(p.email),
    };
  }

  return failureResult(
    inquiryCode,
    subjectWithCode,
    body,
    openMailtoOnFailure,
    'Form relay could not confirm delivery. Use the direct email link below.',
  );
}

export async function submitPrintInquiry(
  p: InquirePayload,
  options: SubmitInquiryOptions = {},
): Promise<InquiryResult> {
  const openMailtoOnFailure = options.openMailtoOnFailure !== false;
  const inquiryCode = p.inquiryCode ?? newInquiryCode();
  const subject = `Print inquiry: ${p.photo.alt || p.photo.id}`;
  const body = bodyText(p, inquiryCode);
  const subjectWithCode = `${subject} [${inquiryCode}]`;
  const mailtoFallbackUrl = mailtoHref(subjectWithCode, body);

  if (await tryRemoteSubmit(p.name, p.email, subject, body, inquiryCode)) {
    return {
      ...successResult(inquiryCode, mailtoFallbackUrl),
      statusMessage: sentConfirmationHint(p.email),
    };
  }

  return failureResult(
    inquiryCode,
    subjectWithCode,
    body,
    openMailtoOnFailure,
    'Form relay could not confirm delivery. Use the direct email link below.',
  );
}

/** Gate-screen outreach: lookbook key, print quote, or licensing — no unlock required. */
export async function submitLookbookAccessRequest(
  p: Pick<ContactPayload, 'name' | 'email' | 'message'> & { inquiryCode?: string },
): Promise<InquiryResult> {
  const message =
    p.message.trim() ||
    'Requesting lookbook access, an archival print quote, or a licensing conversation.';
  return submitContactMessage(
    {
      name: p.name.trim(),
      email: p.email.trim(),
      subject: LOOKBOOK_ACCESS_SUBJECT,
      message,
      inquiryCode: p.inquiryCode,
    },
    { openMailtoOnFailure: false },
  );
}
