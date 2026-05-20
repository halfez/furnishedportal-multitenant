// Last reviewed: 2026-05-14

import { Resend } from 'resend'

const _key = process.env.RESEND_API_KEY ?? ''
const EMAIL_TEST_MODE = !_key || _key.startsWith('re_placeholder')
const resend = EMAIL_TEST_MODE ? null : new Resend(_key)

const FROM = process.env.RESEND_FROM_EMAIL ?? 'noreply@furnishedportal.com'
const _appUrl = process.env.NEXT_PUBLIC_APP_URL
if (!_appUrl) throw new Error('NEXT_PUBLIC_APP_URL is not set — cannot build email links')
const BASE_URL = _appUrl

function base(body: string): string {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f5f5f5;margin:0;padding:0}.wrap{max-width:600px;margin:40px auto;background:#fff;border-radius:8px;overflow:hidden}.header{background:#00798c;padding:28px 32px}.header h1{color:#fff;margin:0;font-size:22px;font-weight:600}.body{padding:32px}.body p{color:#374151;line-height:1.7;margin:0 0 16px}.cta{display:inline-block;background:#00798c;color:#fff;text-decoration:none;padding:14px 28px;border-radius:6px;font-weight:600;font-size:15px;margin:8px 0 24px}.footer{padding:24px 32px;background:#f9f9f9;color:#6b7280;font-size:13px;line-height:1.6}</style></head><body><div class="wrap">${body}</div></body></html>`
}

export async function sendWelcomeEmail({
  to,
  firstName,
  onboardingUrl,
  subdomain,
}: {
  to: string
  firstName: string
  onboardingUrl: string
  subdomain: string
}) {
  const expiryDays = 7
  const html = base(`
    <div class="header"><h1>Welcome to FurnishedPortal</h1></div>
    <div class="body">
      <p>Hi ${firstName},</p>
      <p>Welcome to FurnishedPortal — you're in. Your subdomain <strong>${subdomain}.furnishedportal.com</strong> is reserved and ready to go live.</p>
      <p>Complete the 10-minute setup below. We'll ask about your property, units, house rules, and branding. Once you're done, your site goes live instantly — no waiting, no back-and-forth.</p>
      <a class="cta" href="${onboardingUrl}">Set Up Your Site</a>
      <p style="font-size:13px;color:#6b7280;">This link expires in ${expiryDays} days. If you need a new one, just reply to this email.</p>
    </div>
    <div class="footer">
      <p>FurnishedPortal &mdash; Furnished Midterm Rentals<br>Questions? Reply to this email or visit <a href="${BASE_URL}">${BASE_URL}</a></p>
    </div>
  `)

  if (EMAIL_TEST_MODE || !resend) {
    console.log('[emails] TEST MODE welcome →', to, '| onboarding URL:', onboardingUrl)
    return
  }
  return resend.emails.send({
    from: `FurnishedPortal <${FROM}>`,
    to,
    subject: 'Your FurnishedPortal site is reserved — complete setup',
    html,
  })
}

export async function sendGoLiveEmail({
  to,
  firstName,
  subdomain,
  adminUrl,
  tempPassword,
}: {
  to: string
  firstName: string
  subdomain: string
  adminUrl: string
  tempPassword: string
}) {
  const html = base(`
    <div class="header"><h1>Your site is live!</h1></div>
    <div class="body">
      <p>Hi ${firstName},</p>
      <p>Your site is live at <a href="https://${subdomain}.furnishedportal.com" style="color:#00798c;">${subdomain}.furnishedportal.com</a>. Start sharing it — prospective tenants can apply right now.</p>
      <a class="cta" href="${adminUrl}">Go to Admin Dashboard</a>
      <p><strong>Your login:</strong><br>
      Email: ${to}<br>
      Temporary password: <code style="background:#f3f4f6;padding:2px 6px;border-radius:4px;">${tempPassword}</code></p>
      <p style="font-size:13px;color:#6b7280;">Change your password on first login.</p>
      <p><strong>Three quick wins to do first:</strong></p>
      <ol>
        <li>Upload a few photos in the Gallery</li>
        <li>Share your link on social media or send it to leads</li>
        <li>Check Applications as they come in</li>
      </ol>
    </div>
    <div class="footer">
      <p>FurnishedPortal &mdash; Furnished Midterm Rentals<br>Questions? Reply to this email.</p>
    </div>
  `)

  if (EMAIL_TEST_MODE || !resend) {
    console.log('[emails] TEST MODE go-live →', to, '| admin URL:', adminUrl, '| temp pw:', tempPassword)
    return
  }
  return resend.emails.send({
    from: `FurnishedPortal <${FROM}>`,
    to,
    subject: `Your site is live — ${subdomain}.furnishedportal.com`,
    html,
  })
}
