import { Resend } from 'resend';
import { escapeHtml, isSafePhotoSrc, isValidInquiryEmail, sanitizeEmailHeader } from './inquireEmail.js';

// Unused on GitHub Pages (static). Do not embed keys. Pages outreach uses inquireStatic.

function getResendClient(): Resend | null {
  const key = process.env.RESEND_API_KEY?.trim();
  return key ? new Resend(key) : null;
}

function resendConfigError(): string | null {
  if (!process.env.RESEND_API_KEY?.trim()) {
    return 'RESEND_API_KEY is not configured';
  }
  if (!process.env.RESEND_FROM_EMAIL?.trim()) {
    return 'RESEND_FROM_EMAIL is not configured';
  }
  if (!process.env.INQUIRY_RECIPIENT_EMAIL?.trim()) {
    return 'INQUIRY_RECIPIENT_EMAIL is not configured';
  }
  return null;
}

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const configError = resendConfigError();
    if (configError) {
      return new Response(JSON.stringify({ error: configError }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const resend = getResendClient();
    if (!resend) {
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY is not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const {
      photoId,
      photoAlt,
      photoSrc,
      name,
      email,
      company,
      shippingAddress,
      printSize,
      printMedium,
      printFinish,
      notes,
    } = body;

    if (!name || !email || !shippingAddress || !printSize) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    if (!isValidInquiryEmail(email)) {
      return new Response(JSON.stringify({ error: 'Invalid email address' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const recipientEmail = process.env.INQUIRY_RECIPIENT_EMAIL!.trim();
    const fromEmail = process.env.RESEND_FROM_EMAIL!.trim();

    const safePhotoSrc =
      typeof photoSrc === 'string' && isSafePhotoSrc(photoSrc) ? photoSrc : '';
    const photoLabel = escapeHtml(String(photoAlt || photoId || 'Unknown photo'));
    const safeName = escapeHtml(String(name));
    const safeEmail = escapeHtml(String(email));
    const safeCompany = company ? escapeHtml(String(company)) : '';
    const safeShipping = escapeHtml(String(shippingAddress));
    const safePrintSize = escapeHtml(String(printSize));
    const safePrintMedium = printMedium ? escapeHtml(String(printMedium)) : '';
    const safePrintFinish = printFinish ? escapeHtml(String(printFinish)) : '';
    const safeNotes = notes ? escapeHtml(String(notes)) : '';
    const hrefPhotoSrc = safePhotoSrc ? escapeHtml(safePhotoSrc) : '';

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #02040A; color: #F5F5F5; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 20px; border: 1px solid #e0e0e0; }
            .field { margin-bottom: 15px; }
            .label { font-weight: 600; color: #555; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
            .value { color: #333; margin-top: 4px; }
            .photo-info { background: #fff; padding: 15px; border-left: 3px solid #02040A; margin: 15px 0; }
            .footer { background: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 8px 8px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2 style="margin: 0;">New Print Inquiry</h2>
            </div>
            <div class="content">
              <div class="photo-info">
                <div class="field">
                  <div class="label">Photo</div>
                  <div class="value">${photoLabel}</div>
                </div>
                ${
                  hrefPhotoSrc
                    ? `<div class="field">
                  <div class="label">Photo URL</div>
                  <div class="value"><a href="${hrefPhotoSrc}" target="_blank" rel="noopener noreferrer">${hrefPhotoSrc}</a></div>
                </div>`
                    : ''
                }
              </div>

              <div class="field">
                <div class="label">Name</div>
                <div class="value">${safeName}</div>
              </div>

              <div class="field">
                <div class="label">Email</div>
                <div class="value"><a href="mailto:${safeEmail}">${safeEmail}</a></div>
              </div>

              ${safeCompany ? `
              <div class="field">
                <div class="label">Company / Organization</div>
                <div class="value">${safeCompany}</div>
              </div>
              ` : ''}

              <div class="field">
                <div class="label">Shipping Address</div>
                <div class="value" style="white-space: pre-line;">${safeShipping}</div>
              </div>

              <div class="field">
                <div class="label">Print Size</div>
                <div class="value">${safePrintSize}</div>
              </div>

              ${safePrintMedium ? `
              <div class="field">
                <div class="label">Print Medium</div>
                <div class="value">${safePrintMedium}</div>
              </div>
              ` : ''}

              ${safePrintFinish ? `
              <div class="field">
                <div class="label">Finish</div>
                <div class="value">${safePrintFinish}</div>
              </div>
              ` : ''}

              ${safeNotes ? `
              <div class="field">
                <div class="label">Additional Notes</div>
                <div class="value" style="white-space: pre-line;">${safeNotes}</div>
              </div>
              ` : ''}
            </div>
            <div class="footer">
              <p style="margin: 0;">This inquiry was submitted through your photography portfolio.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const emailText = `
New Print Inquiry

Photo: ${photoAlt || photoId}
${safePhotoSrc ? `Photo URL: ${safePhotoSrc}\n` : ''}
Name: ${name}
Email: ${email}
${company ? `Company: ${company}\n` : ''}
Shipping Address:
${shippingAddress}

Print Size: ${printSize}
${printMedium ? `Print Medium: ${printMedium}\n` : ''}${printFinish ? `Finish: ${printFinish}\n` : ''}
${notes ? `\nAdditional Notes:\n${notes}` : ''}
    `.trim();

    const subjectPhoto = sanitizeEmailHeader(String(photoAlt || photoId || 'Unknown photo'));
    const subjectName = sanitizeEmailHeader(String(name));
    const subjectCompany = company ? sanitizeEmailHeader(String(company)) : '';

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: recipientEmail,
      replyTo: email,
      subject: `New Print Inquiry: ${subjectPhoto} - ${subjectName}${subjectCompany ? ` (${subjectCompany})` : ''}`,
      html: emailHtml,
      text: emailText,
    });

    if (error) {
      console.error('Resend error:', error);
      const message =
        typeof error.message === 'string' && error.message.length > 0
          ? error.message
          : 'Failed to send email';
      return new Response(JSON.stringify({ error: message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({ success: true, messageId: data?.id }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Inquiry handler error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export const config = {
  runtime: 'nodejs',
  regions: ['iad1'],
};
