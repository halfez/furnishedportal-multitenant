// TODO: review copy — placeholder text used; replace with final brand voice before launch.

import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM = process.env.RESEND_FROM_EMAIL ?? 'noreply@furnishedportal.com'
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://furnishedportal.com'

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
      <p>Your payment was received — thank you! Your subdomain <strong>${subdomain}.furnishedportal.com</strong> is reserved and waiting for you.</p>
      <p>Click below to complete the 10-minute setup questionnaire. We'll ask about your property, units, house rules, and branding — then your site goes live.</p>
      <a class="cta" href="${onboardingUrl}">Complete Your Setup</a>
      <p>This link expires in ${expiryDays} days. If you need a new link, reply to this email.</p>
    </div>
    <div class="footer">
      <p>FurnishedPortal &mdash; Furnished Midterm Rentals<br>Questions? Reply to this email or visit <a href="${BASE_URL}">${BASE_URL}</a></p>
    </div>
  `)

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
      <p>Your FurnishedPortal site is now live at <a href="https://${subdomain}.furnishedportal.com">${subdomain}.furnishedportal.com</a>.</p>
      <p>Log in to your admin dashboard to manage applications, update photos, and edit your FAQs:</p>
      <a class="cta" href="${adminUrl}">Open Admin Dashboard</a>
      <p><strong>Your login details:</strong><br>
      Email: ${to}<br>
      Temporary password: <code>${tempPassword}</code></p>
      <p>Change your password after your first login.</p>
      <p><strong>Next steps:</strong></p>
      <ol>
        <li>Share your link with prospective tenants</li>
        <li>Upload photos to your gallery</li>
        <li>Review any incoming applications in the admin panel</li>
      </ol>
    </div>
    <div class="footer">
      <p>FurnishedPortal &mdash; Furnished Midterm Rentals<br>Questions? Reply to this email.</p>
    </div>
  `)

  return resend.emails.send({
    from: `FurnishedPortal <${FROM}>`,
    to,
    subject: `Your site is live — ${subdomain}.furnishedportal.com`,
    html,
  })
}
