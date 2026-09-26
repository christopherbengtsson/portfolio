import { writeAnalytics } from '../lib/analytics.js';
import { MAX_CONTACT_BYTES, MAX_MESSAGE_LENGTH } from '../../src/lib/contact-limits.js';

const messages = {
  en: {
    invalid: 'Please check your name, email, and message. The message must contain 10 to 5,000 characters.',
    invalidName: 'Please enter your name on one line. If you pasted it, try typing it instead.',
    oversize: 'The form submission is too large. Please shorten it and try again.',
    delivery: 'Your message could not be delivered right now. Please email hello@christopherbengtsson.dev directly.',
    heading: 'Your inquiry could not be sent', back: 'Back to the contact form',
    name: 'Name', email: 'Email', message: 'About the project', send: 'Try sending again',
  },
  sv: {
    invalid: 'Kontrollera namn, e-post och meddelande. Meddelandet måste innehålla 10 till 5 000 tecken.',
    invalidName: 'Skriv ditt namn på en rad. Om du klistrade in det, prova att skriva det för hand.',
    oversize: 'Formuläret är för stort. Korta ner innehållet och försök igen.',
    delivery: 'Ditt meddelande kunde inte levereras just nu. Mejla hello@christopherbengtsson.dev direkt.',
    heading: 'Din förfrågan kunde inte skickas', back: 'Tillbaka till kontaktformuläret',
    name: 'Namn', email: 'E-post', message: 'Om projektet', send: 'Försök skicka igen',
  },
};

class BodyTooLargeError extends Error {}

const controlCharacters = /[\u0000-\u001f\u007f-\u009f\u2028\u2029]/u;
const submissionIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

function errorPage(locale, status, message, values) {
  const t = messages[locale];
  const contact = locale === 'sv' ? '/sv/#contact' : '/#contact';
  const form = values && `<form method="post" action="/api/contact?locale=${locale}" accept-charset="UTF-8">
    <input type="hidden" name="locale" value="${locale}">
    <input type="hidden" name="submission_id" value="${values.submissionId}">
    <p><label for="name">${t.name} *</label> <input id="name" name="name" autocomplete="name" maxlength="120" value="${escapeHtml(values.name)}" required></p>
    <p><label for="email">${t.email} *</label> <input id="email" name="email" type="email" autocomplete="email" maxlength="254" value="${escapeHtml(values.replyTo)}" required></p>
    <p><label for="message">${t.message} *</label><br><textarea id="message" name="message" minlength="10" maxlength="${MAX_MESSAGE_LENGTH}" required>${escapeHtml(values.message)}</textarea></p>
    <div hidden><label for="company_site">Company website</label><input id="company_site" name="company_site" autocomplete="off"></div>
    <button type="submit">${t.send}</button>
  </form>`;
  return new Response(`<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${t.heading}</title></head><body><main><h1>${t.heading}</h1><p role="alert">${message}</p>${form || `<p><a href="${contact}">${t.back}</a></p>`}</main></body></html>`, {
    status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

function field(form, name) {
  const value = form.get(name);
  return typeof value === 'string' ? value.trim() : '';
}

async function limitedFormData(request, type) {
  const reader = request.body?.getReader();
  if (!reader) return null;
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_CONTACT_BYTES) {
      await reader.cancel();
      throw new BodyTooLargeError();
    }
    chunks.push(value);
  }
  return new Response(new Blob(chunks), { headers: { 'Content-Type': type } }).formData();
}

export async function onRequestPost({ request, env }) {
  const localeHint = new URL(request.url).searchParams.get('locale');
  const errorLocale = localeHint === 'sv' ? 'sv' : 'en';
  const type = request.headers.get('content-type') || '';
  if (!type.includes('application/x-www-form-urlencoded') && !type.includes('multipart/form-data')) {
    return errorPage(errorLocale, 400, messages[errorLocale].invalid);
  }
  if (Number(request.headers.get('content-length') || 0) > MAX_CONTACT_BYTES) {
    return errorPage(errorLocale, 400, messages[errorLocale].oversize);
  }

  let form;
  try { form = await limitedFormData(request, type); }
  catch (error) {
    return errorPage(errorLocale, 400, error instanceof BodyTooLargeError ? messages[errorLocale].oversize : messages[errorLocale].invalid);
  }
  if (!form) return errorPage(errorLocale, 400, messages[errorLocale].invalid);

  const locale = localeHint === 'sv' || localeHint === 'en' ? localeHint : field(form, 'locale') === 'sv' ? 'sv' : 'en';
  const name = field(form, 'name');
  const replyTo = field(form, 'email');
  const message = field(form, 'message');
  const incomingSubmissionId = field(form, 'submission_id');
  const submissionId = submissionIdPattern.test(incomingSubmissionId) ? incomingSubmissionId : crypto.randomUUID();
  const values = { name, replyTo, message, submissionId };
  const success = locale === 'sv' ? '/sv/#contact-success' : '/#contact-success';

  if (field(form, 'company_site')) {
    return new Response(null, { status: 303, headers: { Location: success, 'Cache-Control': 'no-store' } });
  }

  const validEmail = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(replyTo);
  if (controlCharacters.test(name)) return errorPage(locale, 400, messages[locale].invalidName, values);
  if (!name || name.length > 120 || !validEmail || controlCharacters.test(replyTo) || replyTo.length > 254 || message.length < 10 || message.length > MAX_MESSAGE_LENGTH) {
    return errorPage(locale, 400, messages[locale].invalid, values);
  }

  if (!env?.RESEND_API_KEY || !env?.RESEND_FROM_EMAIL) {
    return errorPage(locale, 503, messages[locale].delivery, values);
  }

  const body = `Language: ${locale}\nName: ${name}\nEmail: ${replyTo}\n\nMessage:\n${message}`;
  const payload = JSON.stringify({
    from: env.RESEND_FROM_EMAIL,
    to: ['hello@christopherbengtsson.dev'],
    reply_to: replyTo,
    subject: 'Project inquiry',
    text: body,
  });
  let response;
  try {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(payload));
    const payloadHash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
    const idempotencyKey = `contact/${submissionId}/${payloadHash}`;
    response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
      body: payload,
    });
  } catch {
    return errorPage(locale, 503, messages[locale].delivery, values);
  }

  if (!response.ok) return errorPage(locale, 503, messages[locale].delivery, values);
  writeAnalytics(env, request, { event: 'form_success', locale, path: locale === 'sv' ? '/sv/' : '/', target: 'contact' });
  return new Response(null, { status: 303, headers: { Location: success, 'Cache-Control': 'no-store' } });
}
