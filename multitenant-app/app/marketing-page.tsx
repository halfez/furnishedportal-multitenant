'use client'

import { useState, useCallback, useEffect } from 'react'
import './marketing.css'

// ─── CTAs ─────────────────────────────────────────────────────────────────────
const TALLY_URL = 'https://tally.so/r/aQAMz2'
const STRIPE_STANDARD_URL = 'https://buy.stripe.com/3cI6oI6oQf6Q3Fzaxc7Re08'

// ─── Icons ────────────────────────────────────────────────────────────────────
function Icon({ name, size = 20, stroke = 1.75 }: { name: string; size?: number; stroke?: number }) {
  const c = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: stroke, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  switch (name) {
    case 'card': return <svg {...c}><rect x="2.5" y="6" width="19" height="13" rx="2"/><path d="M2.5 10h19M7 15h3"/></svg>
    case 'lock': return <svg {...c}><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
    case 'signature': return <svg {...c}><path d="M3 19c3-1 5-4 6-7s2-7 4-7 2 5 1 8-2 5 0 6c1.5.7 3-1 4-2"/><path d="M3 21h18"/></svg>
    case 'shield': return <svg {...c}><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"/><path d="M9 12l2 2 4-4"/></svg>
    case 'external': return <svg {...c}><path d="M14 4h6v6M20 4l-9 9M19 14v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>
    case 'chevron': return <svg {...c}><path d="M6 9l6 6 6-6"/></svg>
    case 'user': return <svg {...c}><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4.5 4.5-7 8-7s7 2.5 8 7"/></svg>
    case 'x': return <svg {...c}><path d="M6 6l12 12M18 6L6 18"/></svg>
    default: return null
  }
}

// ─── Mock Screenshots ──────────────────────────────────────────────────────────
function DashboardShot() {
  return (
    <div className="ss-app">
      <aside className="ss-side">
        <div className="ss-side-brand"><span className="ss-side-brand-badge">FP</span> The Henderson House</div>
        <div className="ss-side-item active"><span className="dotmark"/>Dashboard</div>
        <div className="ss-side-item"><span className="dotmark"/>Bookings</div>
        <div className="ss-side-item"><span className="dotmark"/>Applications</div>
        <div className="ss-side-item"><span className="dotmark"/>Leases</div>
        <div className="ss-side-item"><span className="dotmark"/>Payments</div>
        <div className="ss-side-item"><span className="dotmark"/>Calendar</div>
        <div className="ss-side-sec">Listing</div>
        <div className="ss-side-item"><span className="dotmark"/>Site editor</div>
        <div className="ss-side-item"><span className="dotmark"/>Concierge</div>
        <div className="ss-side-item"><span className="dotmark"/>Settings</div>
      </aside>
      <div className="ss-main">
        <div className="ss-topbar">
          <div className="ss-bc">Properties · <b>The Henderson House</b></div>
          <div className="ss-search">⌕  Search bookings, tenants…</div>
          <div className="ss-avatar">HK</div>
        </div>
        <div className="ss-page">
          <div>
            <h2 className="ss-h1">Good morning, Hoshang</h2>
            <p className="ss-sub">Last 30 days · 1 property · all in central time</p>
          </div>
          <div className="ss-kpis">
            <div className="ss-kpi"><div className="ss-kpi-l">Occupancy</div><div className="ss-kpi-v">92%</div><div className="ss-kpi-d">+8 pts vs last mo</div></div>
            <div className="ss-kpi"><div className="ss-kpi-l">Revenue (MTD)</div><div className="ss-kpi-v">$4,850</div><div className="ss-kpi-d">on pace</div></div>
            <div className="ss-kpi"><div className="ss-kpi-l">Open applications</div><div className="ss-kpi-v">3</div><div className="ss-kpi-d" style={{ color: '#8C5A0A' }}>1 needs review</div></div>
            <div className="ss-kpi"><div className="ss-kpi-l">Concierge replies</div><div className="ss-kpi-v">27</div><div className="ss-kpi-d">94% resolved</div></div>
          </div>
          <div className="ss-row">
            <div className="ss-card">
              <div className="ss-card-h">Recent applications <span className="lnk">View all →</span></div>
              <table className="ss-table">
                <thead><tr><th>Applicant</th><th>Move-in</th><th>Term</th><th>Status</th></tr></thead>
                <tbody>
                  <tr><td>M. Alvarez</td><td>Jun 1</td><td>3 mo</td><td><span className="ss-badge new">New</span></td></tr>
                  <tr><td>T. Okafor</td><td>Jun 14</td><td>6 mo</td><td><span className="ss-badge pending">Review</span></td></tr>
                  <tr><td>L. Schmidt</td><td>May 28</td><td>2 mo</td><td><span className="ss-badge ok">Approved</span></td></tr>
                  <tr><td>R. Patel</td><td>Jul 1</td><td>4 mo</td><td><span className="ss-badge ok">Lease sent</span></td></tr>
                </tbody>
              </table>
            </div>
            <div className="ss-card ss-pers">
              <div className="ss-card-h" style={{ padding: 0, border: 0, marginBottom: 4 }}>Today</div>
              <div className="ss-todo done"><div className="cb"/><div><div className="t">Approve M. Alvarez application</div><div className="m">Verified income · 720 credit</div></div></div>
              <div className="ss-todo"><div className="cb"/><div><div className="t">Send lease to T. Okafor (furnished MTR, 90 days)</div><div className="m">Auto-generated · ready to review</div></div></div>
              <div className="ss-todo"><div className="cb"/><div><div className="t">Rent reminder · L. Schmidt</div><div className="m">Auto-charges Stripe Jun 1</div></div></div>
              <div className="ss-todo"><div className="cb"/><div><div className="t">Reply to concierge escalation</div><div className="m">Parking question · 2h ago</div></div></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function CalendarShot() {
  const dows = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const days: { d: number; muted?: boolean }[] = []
  for (let d = 26; d <= 30; d++) days.push({ d, muted: true })
  for (let d = 1; d <= 31; d++) days.push({ d })
  for (let d = 1; d <= 6; d++) days.push({ d, muted: true })
  const may = (n: number) => 5 + n - 1
  const today = may(22)
  const bands: Record<number, { kind: string; label: string }> = {
    [may(3)]: { kind: 'start', label: 'M. Alvarez · pd through Jun 17' },
    [may(18)]: { kind: 'hold-start', label: 'Turnover' },
    [may(20)]: { kind: 'start', label: 'T. Okafor · 6 mo' },
  }
  const inBook1 = (i: number) => i >= may(3) && i <= may(17)
  const inHold = (i: number) => i >= may(18) && i <= may(19)
  const inBook2 = (i: number) => i >= may(20) && i <= may(31)
  return (
    <div className="ss-app">
      <aside className="ss-side">
        <div className="ss-side-brand"><span className="ss-side-brand-badge">FP</span> The Henderson House</div>
        <div className="ss-side-item"><span className="dotmark"/>Dashboard</div>
        <div className="ss-side-item"><span className="dotmark"/>Bookings</div>
        <div className="ss-side-item"><span className="dotmark"/>Applications</div>
        <div className="ss-side-item"><span className="dotmark"/>Leases</div>
        <div className="ss-side-item"><span className="dotmark"/>Payments</div>
        <div className="ss-side-item active"><span className="dotmark"/>Calendar</div>
        <div className="ss-side-sec">Listing</div>
        <div className="ss-side-item"><span className="dotmark"/>Site editor</div>
        <div className="ss-side-item"><span className="dotmark"/>Concierge</div>
        <div className="ss-side-item"><span className="dotmark"/>Settings</div>
      </aside>
      <div className="ss-main">
        <div className="ss-topbar">
          <div className="ss-bc">Calendar · <b>May 2026</b></div>
          <div className="ss-search">⌕  Filter bookings…</div>
          <div className="ss-avatar">HK</div>
        </div>
        <div className="ss-page">
          <div className="ss-cal">
            <div className="ss-cal-h">
              <div className="ss-cal-prop">
                <div className="ss-cal-thumb"/>
                <div><b>The Henderson House</b><br/><span>3 BR · Southtown · Live</span></div>
              </div>
              <div className="ss-cal-nav">
                <span className="ss-cal-nav-btn">‹</span>
                <span style={{ fontWeight: 600, color: '#1A1A1A' }}>May 2026</span>
                <span className="ss-cal-nav-btn">›</span>
              </div>
            </div>
            <div className="ss-cal-grid">
              {dows.map(d => <div key={d} className="ss-cal-dow">{d}</div>)}
              {days.map((day, i) => {
                const cls = ['ss-cal-day']
                if (day.muted) cls.push('muted')
                if (i === today) cls.push('today')
                if (!day.muted) {
                  if (inBook1(i)) cls.push('book')
                  if (inHold(i)) cls.push('hold')
                  if (inBook2(i)) cls.push('book')
                }
                const band = bands[i]
                return (
                  <div key={i} className={cls.join(' ')}>
                    <div className="d">{day.d}</div>
                    {band && (
                      band.kind === 'hold-start'
                        ? <div className="ss-cal-band hold start">{band.label}</div>
                        : <div className="ss-cal-band start">{band.label}</div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function LeaseShot() {
  return (
    <div className="ls">
      <aside className="ls-side">
        <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A', marginBottom: 4 }}>Lease · T. Okafor</div>
        <div style={{ fontSize: 11.5, color: '#5C5A57' }}>The Henderson House · 6-month term</div>
        <div className="ls-step-list">
          <div className="ls-step done"><span className="ls-step-num">✓</span><div className="t">Identity verified</div></div>
          <div className="ls-step done"><span className="ls-step-num">✓</span><div className="t">Application approved</div></div>
          <div className="ls-step done"><span className="ls-step-num">✓</span><div className="t">Lease auto-generated</div></div>
          <div className="ls-step active"><span className="ls-step-num">4</span><div className="t">Review &amp; sign (Texas)</div></div>
          <div className="ls-step"><span className="ls-step-num">5</span><div className="t">Deposit via Stripe</div></div>
          <div className="ls-step"><span className="ls-step-num">6</span><div className="t">Check-in details sent</div></div>
        </div>
        <div className="ls-side-meta">
          <b>Audit trail</b>
          <div><span>IP signed from</span><span style={{ color: '#1A1A1A' }}>173.x.x.41</span></div>
          <div><span>Doc hash</span><span style={{ color: '#1A1A1A', fontFamily: 'var(--mono)' }}>e9c1…b2af</span></div>
          <div><span>Sent</span><span style={{ color: '#1A1A1A' }}>May 22, 10:14 CT</span></div>
        </div>
      </aside>
      <div className="ls-main">
        <div className="ls-bc">Leases / T. Okafor / <b style={{ color: '#1A1A1A' }}>Review &amp; sign</b></div>
        <h1 className="ls-h1">Furnished MTR lease · review &amp; sign</h1>
        <div className="ls-doc">
          <h4>Section 4 · Term &amp; rent</h4>
          <p>This lease shall commence on <span className="hi">June 14, 2026</span> and terminate on <span className="hi">December 14, 2026</span>, for a total term of six (6) months. Monthly rent of <span className="hi">$3,250.00</span> is due on the 1st of each month and shall be collected via the Landlord's Stripe account on file.</p>
          <h4>Section 5 · Security deposit</h4>
          <p>Tenant shall remit a security deposit of $3,250.00 prior to occupancy. Pursuant to Texas Property Code §92.103, the deposit shall be returned within 30 days of move-out, less itemized deductions…</p>
          <div className="ls-sign-row">
            <div className="ls-sign done">
              <div className="ls-sign-l">Landlord · signed</div>
              <div className="ls-sign-sig">Hoshang K.</div>
              <div className="ls-sign-mini">May 22, 2026 · 10:14 CT</div>
            </div>
            <div className="ls-sign">
              <div className="ls-sign-l">Tenant · awaiting</div>
              <div className="ls-sign-sig" style={{ color: '#B8D4EE' }}>Click to sign</div>
              <div className="ls-sign-mini">T. Okafor · sent 2h ago</div>
              <div className="ls-sign-btn">Adopt &amp; sign</div>
            </div>
          </div>
        </div>
        <div className="ls-bar">
          <div className="ls-bar-l">
            <span className="ico">✓</span>
            <div>Audit-trail e-signature · time-stamped, IP-logged, document-hashed</div>
          </div>
          <div className="ls-bar-actions">
            <span className="ls-bar-btn ghost">Download PDF</span>
            <span className="ls-bar-btn primary">Send to tenant</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function TenantSiteShot() {
  return (
    <div className="ts">
      <div className="ts-nav">
        <div className="ts-brand"><span className="ts-brand-mark">H</span> The Henderson House</div>
        <div className="ts-navlinks">
          <a className="active">Home</a><a>Photos</a><a>Amenities</a><a>Apply</a><a>FAQ</a>
        </div>
      </div>
      <div className="ts-hero">
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.08em', color: '#5C5A57', textTransform: 'uppercase', marginBottom: 8 }}>SOUTHTOWN · 3 BR · FULLY FURNISHED</div>
          <h1>A quiet bungalow off South Alamo Street, ready for a 30 to 90 day stay.</h1>
          <p>Walk to the Pearl, bike downtown in 12 minutes. Fast wi-fi, real desk, blackout shades. Built for travel nurses, relocators, and remote teams.</p>
          <div className="ts-hero-cta">
            <span className="ts-btn">Check availability →</span>
            <span className="ts-btn alt">Photos &amp; floorplan</span>
          </div>
        </div>
        <div className="ts-photo"><span>// drop hero photo</span></div>
      </div>
      <div className="ts-section">
        <h2 className="ts-h2">Amenities</h2>
        <div className="ts-amen">
          <div className="ts-amen-item"><span className="b"/>Gigabit Wi-Fi</div>
          <div className="ts-amen-item"><span className="b"/>Dedicated workspace</div>
          <div className="ts-amen-item"><span className="b"/>Washer / dryer in unit</div>
          <div className="ts-amen-item"><span className="b"/>Off-street parking</div>
          <div className="ts-amen-item"><span className="b"/>Pet-friendly (≤40 lb)</div>
          <div className="ts-amen-item"><span className="b"/>Smart locks</div>
          <div className="ts-amen-item"><span className="b"/>Linens + cookware</div>
          <div className="ts-amen-item"><span className="b"/>Weekly cleaning add-on</div>
        </div>
      </div>
      <div className="ts-apply">
        <div className="ts-form">
          <h3>Apply to stay</h3>
          <div className="ts-form-row">
            <input className="ts-input" placeholder="First name" defaultValue="Taylor" readOnly/>
            <input className="ts-input" placeholder="Last name" defaultValue="Okafor" readOnly/>
            <input className="ts-input full" placeholder="Email" defaultValue="taylor@example.com" readOnly/>
            <input className="ts-input" placeholder="Move-in" defaultValue="Jun 14" readOnly/>
            <input className="ts-input" placeholder="Length of stay" defaultValue="6 months" readOnly/>
            <input className="ts-input full muted" placeholder="Tell us about you (work, pets, etc.)" readOnly/>
          </div>
          <div className="ts-form-cta">Submit application →</div>
        </div>
        <div className="ts-chat" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="ts-chat-h">
            <div className="ts-chat-spark">✦</div>
            <div><b>Ask Henderson</b><br/><span>Concierge · usually replies instantly</span></div>
          </div>
          <div className="ts-msg me">Is parking included?</div>
          <div className="ts-msg bot">Yes, one off-street spot is included. There's also free street parking on Lott Ave. Want me to send the parking map?</div>
          <div className="ts-msg me">What about pets?</div>
          <div className="ts-msg bot">Dogs under 40 lb are welcome with a one-time $250 pet fee. Two-pet max. I can add it to your application. Should I?</div>
          <div className="ts-chat-input"><span>✦</span> Type a question…</div>
        </div>
      </div>
    </div>
  )
}

// ─── Hero art (floating cards) ────────────────────────────────────────────────
function HeroArt() {
  return (
    <div style={{ position: 'relative', aspectRatio: '5/4' }}>
      {/* Browser frame */}
      <div className="shot-frame" style={{ margin: 0, position: 'absolute', inset: '4% 0 0 4%', width: '92%', transform: 'rotate(-1deg)' }}>
        <div className="browser-chrome">
          <div className="dots"><span className="dot r"/><span className="dot y"/><span className="dot g"/></div>
          <div className="addr"><span className="addr-lock">🔒</span> thehendersonhouse.com</div>
        </div>
        <div style={{ height: 380, overflow: 'hidden', background: '#fff' }}>
          <div style={{ transform: 'scale(.55)', transformOrigin: 'top left', width: 'calc(100% / .55)', height: 'calc(380px / .55)' }}>
            <TenantSiteShot/>
          </div>
        </div>
      </div>
      {/* Mini calendar */}
      <div className="card" style={{ position: 'absolute', right: '-4%', bottom: '-2%', width: '56%', padding: 14, boxShadow: '0 20px 60px -10px rgba(20,18,15,.25)', transform: 'rotate(2deg)' }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.06em', color: '#5C5A57', textTransform: 'uppercase', marginBottom: 8 }}>Availability · May</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, fontSize: 11 }}>
          {Array.from({ length: 35 }).map((_, i) => {
            const d = i - 4
            const inRange = (d >= 3 && d <= 17) || (d >= 20 && d <= 31)
            const isHold = d === 18 || d === 19
            const today = d === 22
            return (
              <div key={i} style={{
                aspectRatio: '1', borderRadius: 4,
                background: today ? '#0067C0' : inRange ? '#E8F1FB' : isHold ? 'repeating-linear-gradient(135deg,#F6F1EA 0 4px,#FBF7EE 4px 8px)' : '#FAF9F7',
                color: today ? '#fff' : d < 1 || d > 31 ? '#C2BEB8' : '#3A3937',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: today ? 700 : 500,
                border: today ? '0' : '1px solid #F0EFEC',
                fontFeatureSettings: '"tnum"',
              }}>{d > 0 && d <= 31 ? d : ''}</div>
            )
          })}
        </div>
        <div style={{ marginTop: 10, display: 'flex', gap: 10, fontSize: 10.5, color: '#5C5A57' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, background: '#E8F1FB', borderRadius: 2 }}/> Booked</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, background: 'repeating-linear-gradient(135deg,#F6F1EA 0 3px,#FBF7EE 3px 6px)', borderRadius: 2 }}/> Hold</span>
        </div>
      </div>
      {/* Concierge bubble */}
      <div className="card" style={{ position: 'absolute', left: '-2%', top: '-2%', width: '42%', padding: 14, boxShadow: '0 14px 40px -10px rgba(20,18,15,.22)', transform: 'rotate(-3deg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <div style={{ width: 24, height: 24, borderRadius: 6, background: '#E8F1FB', color: '#0067C0', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>✦</div>
          <div style={{ fontSize: 12, fontWeight: 600 }}>Ask Chatbot</div>
        </div>
        <div style={{ padding: '8px 10px', background: '#0067C0', color: '#fff', borderRadius: 10, borderBottomRightRadius: 3, fontSize: 12, maxWidth: '90%', marginLeft: 'auto', marginBottom: 6 }}>Pets ok?</div>
        <div style={{ padding: '8px 10px', background: '#F3F2F0', borderRadius: 10, borderBottomLeftRadius: 3, fontSize: 11.5, lineHeight: 1.4 }}>Dogs under 40 lb are welcome with a $250 pet fee. Want me to add it to your application?</div>
      </div>
    </div>
  )
}

// ─── Demo Modal ───────────────────────────────────────────────────────────────
function DemoModal({ onClose, onCTA }: { onClose: () => void; onCTA: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', h); document.body.style.overflow = '' }
  }, [onClose])
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-bar">
          <div className="modal-bar-l">
            <div className="dots"><span className="dot r"/><span className="dot y"/><span className="dot g"/></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: '#107C41' }}>🔒</span>
              <span className="mono" style={{ fontSize: 12 }}>thehendersonhouse.com</span>
            </div>
            <span style={{ marginLeft: 8, padding: '3px 8px', background: '#E8F1FB', color: '#0067C0', borderRadius: 4, fontSize: 11, fontWeight: 600, letterSpacing: .2 }}>SAMPLE · LIVE DEMO</span>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close demo"><Icon name="x" size={14}/></button>
        </div>
        <div className="modal-body">
          <div style={{ border: '1px solid #E8E6E3', borderRadius: 10, overflow: 'hidden', background: '#fff', boxShadow: '0 8px 24px rgba(0,0,0,.08)' }}>
            <TenantSiteShot/>
          </div>
          <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#5C5A57', fontSize: 13, gap: 16, flexWrap: 'wrap' }}>
            <div>This is a real branded tenant site rendered live. Every host's looks like this on their own domain.</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary btn-sm" onClick={onClose}>Close demo</button>
              <button className="btn btn-primary btn-sm" onClick={() => { onClose(); onCTA() }}>Claim founding-cohort spot →</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Sections ──────────────────────────────────────────────────────────────────
function Nav({ onCTA }: { onCTA: () => void }) {
  return (
    <header className="nav">
      <div className="container nav-inner">
        <a className="logo" href="/" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>
          <span className="logo-badge" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/></svg>
          </span>
          <span>FurnishedPortal</span>
        </a>
        <nav className="nav-links" aria-label="Primary">
          <a className="nav-link" href="#features">Features</a>
          <a className="nav-link" href="#how">How it works</a>
          <a className="nav-link" href="#compare">Compare</a>
          <a className="nav-link" href="#pricing">Pricing</a>
          <a className="nav-link" href="#faq">FAQ</a>
        </nav>
        <div className="nav-cta">
          <a className="btn btn-ghost btn-sm" href="https://app.furnishedportal.com/admin">Sign in</a>
          <button className="btn btn-primary btn-sm" onClick={onCTA}>Claim founding-cohort spot</button>
        </div>
      </div>
    </header>
  )
}

function HeroSplit({ onDemo, onCTA }: { onDemo: () => void; onCTA: () => void }) {
  return (
    <section className="hero">
      <div className="hero-bg"/>
      <div className="container hero-inner">
        <div className="hero-split">
          <div className="hero-copy">
            <span className="pill"><span className="pill-dot">★</span> Founding cohort open · first 10 hosts</span>
            <h1 className="hero-h1" style={{ marginTop: 18 }}>Self-manage MTR. <em>Keep More Cashflow</em></h1>
            <p className="lede" style={{ marginTop: 18 }}>Built for MTR hosts tired of juggling e-signature, payment, and spreadsheets.</p>
            <div className="econ">
              <div className="econ-num">20 to 25%<small>TYPICAL PM FEE</small></div>
              <div className="econ-body">Stop Giving Away <b>20 to 25% of rent</b>. On 3 units at $3,000/mo that's about <b>$1,800 to $2,250 every month</b>. FurnishedPortal is <b>$49 per property per month</b>. You self-manage and keep the difference.</div>
            </div>
            <div className="hero-actions">
              <button className="btn btn-primary btn-lg" onClick={onCTA}>Claim Your Founding Spot</button>
              <button className="btn btn-secondary btn-lg" onClick={onDemo}>
                Try the live demo <Icon name="external" size={15}/>
              </button>
            </div>
            <div className="hero-meta">
              <span className="hero-meta-item"><span className="check">✓</span> Run 2 to 5 units yourself</span>
              <span className="hero-meta-item"><span className="check">✓</span> $49/property/mo locked for life</span>
              <span className="hero-meta-item"><span className="check">✓</span> Pay nothing until your first tenant is fully processed</span>
            </div>
          </div>
          <div className="hero-art" style={{ marginTop: 8 }}>
            <HeroArt/>
          </div>
        </div>
      </div>
    </section>
  )
}

function TrustBand() {
  const items = [
    { ico: 'card', label: 'Payments handled by Stripe' },
    { ico: 'lock', label: 'Bank-level data security' },
    { ico: 'signature', label: 'Court-ready e-signatures' },
    { ico: 'shield', label: 'Your data stays yours' },
  ]
  return (
    <section className="trust-band">
      <div className="container trust-inner">
        <div className="trust-label">ENTERPRISE-GRADE SECURITY FOR INDEPENDENT HOSTS.</div>
        <div className="trust-items">
          {items.map((it, i) => (
            <div key={i} className="trust-item">
              <span className="trust-icon"><Icon name={it.ico} size={18}/></span>
              {it.label}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function SixTools() {
  return (
    <section className="section" id="features">
      <div className="container">
        <div style={{ maxWidth: 720 }}>
          <span className="eyebrow">The self-management stack</span>
          <h2 style={{ marginTop: 14 }}>Three systems. One self-managed Portal</h2>
          <p className="lede" style={{ marginTop: 14 }}>Qualify leads, automate operations, and stay profitable without a property manager.</p>
        </div>
        <div className="pillars">
          <div className="pillar">
            <div className="pillar-head">
              <span className="pillar-num">PILLAR 01</span>
              <h3>Stop losing leads.</h3>
            </div>
            <div>
              <p className="pillar-body">Qualify inquiries in 24 to 48 hours. Furnished Finder, Airbnb, repeat tenants, and insurance referrals — all in one place, with the details that actually matter: contract end date, payor, and ALE documentation.</p>
            </div>
          </div>
          <div className="pillar">
            <div className="pillar-head">
              <span className="pillar-num">PILLAR 02</span>
              <h3>Run every stay clean.</h3>
              <p style={{ fontSize: 14, color: 'var(--ink-3)' }}>Lease, ledger, and inventory built around 30 to 90 day stays.</p>
            </div>
            <div className="pillar-sub">
              <div className="pillar-sub-item">
                <h4>Furnished MTR leases in minutes.</h4>
                <p>Utilities included, furnishings inventory, pet and parking addenda, state-specific 30-day protections. Not a residential template Frankenstein-ed in DocuSign.</p>
              </div>
              <div className="pillar-sub-item">
                <h4>A stay ledger that bends with the stay.</h4>
                <p>Pro-rated move-ins, mid-stay extensions, and early departures in one click. The 6-month stay that becomes 8 months with one tenant text.</p>
              </div>
              <div className="pillar-sub-item">
                <h4>Furnished inventory between every turn.</h4>
                <p>Track items between turns. Recover costs, avoid deposit disputes, restock without thinking.</p>
              </div>
            </div>
          </div>
          <div className="pillar">
            <div className="pillar-head">
              <span className="pillar-num">PILLAR 03</span>
              <h3>Solo-operator viable.</h3>
            </div>
            <div>
              <p className="pillar-body">Replace the five tools you're duct-taping together and shift the right work to tenant self-service, so you run 2 to 5 properties by yourself without it eating your weekends.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function ProductShowcase() {
  const tabs = [
    { id: 'dash', label: 'Host dashboard', sub: 'Daily ops at a glance', el: <DashboardShot/>, addr: 'app.furnishedportal.com/properties/henderson-house' },
    { id: 'cal', label: 'Availability calendar', sub: 'Bookings, holds, turnovers', el: <CalendarShot/>, addr: 'app.furnishedportal.com/calendar' },
    { id: 'lease', label: 'Lease signing', sub: 'Furnished MTR, audit-trailed', el: <LeaseShot/>, addr: 'app.furnishedportal.com/leases/okafor-jun' },
  ]
  const [active, setActive] = useState('dash')
  const tab = tabs.find(t => t.id === active)!
  return (
    <section className="section" style={{ background: 'var(--bg-alt)', paddingTop: 80, paddingBottom: 80 }}>
      <div className="container">
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ maxWidth: 600 }}>
            <span className="eyebrow">Inside the product</span>
            <h2 style={{ marginTop: 14 }}>Built for the way MTRs actually work.</h2>
            <p className="lede" style={{ marginTop: 14 }}>1–12 month stays need more than a vacation-rental booking widget. We sweat the operator workflow.</p>
          </div>
          <div className="shot-tabs" role="tablist">
            {tabs.map(t => (
              <button key={t.id} className={'shot-tab' + (active === t.id ? ' active' : '')} onClick={() => setActive(t.id)}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="shot-frame">
          <div className="browser-chrome">
            <div className="dots"><span className="dot r"/><span className="dot y"/><span className="dot g"/></div>
            <div className="addr"><span className="addr-lock">🔒</span> {tab.addr}</div>
            <span className="mono" style={{ color: 'var(--ink-4)', fontSize: 11 }}>{tab.sub}</span>
          </div>
          <div style={{ height: 560, overflow: 'hidden', background: '#FAF9F7' }}>
            {tab.el}
          </div>
        </div>
      </div>
    </section>
  )
}

function HowItWorks() {
  const steps = [
    { n: '01', t: 'Onboarding call', d: '30 min with Hoshang. Walk through your 2 to 5 properties, your terms, and your FAQ.' },
    { n: '02', t: 'We build your site', d: 'Branded site on your domain. Concierge trained on your house rules.' },
    { n: '03', t: 'Connect Stripe', d: 'Plug in your Stripe account so deposits and rent route straight to you.' },
    { n: '04', t: 'Run it yourself', d: 'Most hosts are qualifying inquiries in 24 to 48 hours within the first week.' },
  ]
  return (
    <section className="section" id="how">
      <div className="container">
        <div style={{ maxWidth: 680 }}>
          <span className="eyebrow">How it works</span>
          <h2 style={{ marginTop: 14 }}>White-glove setup. Operations run by you.</h2>
          <p className="lede" style={{ marginTop: 14 }}>No 12-week implementation. No Zapier rabbit holes. You give us your terms, we hand you a fully operational MTR system.</p>
        </div>
        <div className="steps">
          {steps.map((s, i) => (
            <div key={i} className="step">
              <div className="step-num">{s.n}</div>
              <h3>{s.t}</h3>
              <p>{s.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Comparison() {
  const Yes = ({ children }: { children?: React.ReactNode }) => <span className="cmp-yes"><span className="ico">✓</span>{children || 'Included'}</span>
  const No = ({ children }: { children?: React.ReactNode }) => <span className="cmp-no"><span className="ico">–</span>{children || 'Not included'}</span>
  const Par = ({ children }: { children?: React.ReactNode }) => <span className="cmp-partial"><span className="ico">~</span>{children || 'Partial'}</span>
  const rows: [string, React.ReactNode, React.ReactNode][] = [
    ['Your own branded website', <Yes key="1">On your domain</Yes>, <Par key="1">Squarespace</Par>],
    ['Tenant applications', <Yes key="2">Built-in, structured</Yes>, <Par key="2">Google Forms</Par>],
    ['Live availability calendar', <Yes key="3">Synced to your site</Yes>, <Par key="3">Calendly, manually</Par>],
    ['Furnished MTR leases', <Yes key="4">Auto-generated with addenda</Yes>, <Par key="4">DocuSign + a residential template</Par>],
    ['Stay ledger (extensions, pro-rates)', <Yes key="5">One-click adjustments</Yes>, <No key="5">Spreadsheet math on Sunday night</No>],
    ['Furnished inventory tracking', <Yes key="6">Between every turn</Yes>, <No key="6">Photos in a folder</No>],
    ['Payments', <Yes key="7">Stripe, recurring</Yes>, <Par key="7">Stripe links, manual</Par>],
    ['AI concierge', <Yes key="8">Trained on your FAQ</Yes>, <No key="8">None</No>],
    ['Monthly cost', <span key="9" className="cmp-cost" style={{ color: 'var(--fp-blue)' }}>$49/property + $499 setup</span>, <span key="9b" className="cmp-cost">~$80 to $120/mo across 4 tools</span>],
  ]
  return (
    <section className="section" id="compare" style={{ background: 'var(--bg-alt)' }}>
      <div className="container">
        <div style={{ maxWidth: 760 }}>
          <span className="eyebrow">Versus the do-it-yourself stack</span>
          <h2 style={{ marginTop: 14 }}>One operating system. Not five duct-taped tools.</h2>
          <p className="lede" style={{ marginTop: 14 }}>Most self-managing hosts assemble this themselves from Squarespace, Google Forms, DocuSign, Calendly, and a spreadsheet. It works until a 6-month stay becomes 8 months, or a tenant moves out 11 days early.</p>
        </div>
        <div className="cmp">
          <table className="cmp-table">
            <thead>
              <tr>
                <th>Capability</th>
                <th className="cmp-th-fp">FurnishedPortal</th>
                <th>Squarespace + Forms + DocuSign + Calendly</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td>{r[0]}</td>
                  <td className="cmp-col-fp">{r[1]}</td>
                  <td>{r[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="cmp-note">Furnished Finder is a lead source many hosts use alongside us. We handle what comes next: applications, leases, deposits, payments, and the stay itself.</p>
      </div>
    </section>
  )
}

function SocialProof() {
  return (
    <section className="section">
      <div className="container">
        <div style={{ maxWidth: 680 }}>
          <span className="eyebrow">Founding cohort</span>
          <h2 style={{ marginTop: 14 }}>No invented quotes. The real ones land here.</h2>
          <p className="lede" style={{ marginTop: 14 }}>We could have fabricated three smiling testimonials and a fake skyline of city tags. We're not going to.</p>
        </div>
        <div className="single-note">
          <b>We're onboarding our first 10 founding hosts now.</b>
          Real quotes go here as they come in. If you're a self-managing MTR host in the US and you want a direct line into the build, that's what the founding cohort is.
        </div>
      </div>
    </section>
  )
}

function Founder() {
  return (
    <section className="section" style={{ background: 'var(--bg-warm)' }}>
      <div className="container">
        <div className="founder">
          <div className="founder-photo">
            <Icon name="user" size={36}/>
            <div style={{ marginTop: 8 }}>drop founder portrait</div>
          </div>
          <div>
            <span className="eyebrow">The founder</span>
            <h2 style={{ marginTop: 14, fontSize: 'clamp(24px,2.4vw,30px)' }}>I built this because I needed it.</h2>
            <p className="founder-quote" style={{ marginTop: 18 }}>
              "I run a midterm rental in Downtown, San Antonio. After my third week of copy-pasting the same 'is parking included?' email at 11pm, and tracking deposits in a spreadsheet, I quit waiting for someone else to build the tool I wanted. FurnishedPortal is that tool."
            </p>
            <div className="founder-sig">
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg,#F6F1EA,#EAE2D2)', border: '1px solid var(--border)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, color: 'var(--ink-2)' }}>HK</div>
              <div>
                <b>Hoshang Hafizi</b>
                <span>Founder · MTR host · San Antonio, TX</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function Pricing({ onFoundingCTA, onStandardCTA }: { onFoundingCTA: () => void; onStandardCTA: () => void }) {
  return (
    <section className="section" id="pricing">
      <div className="container">
        <div style={{ maxWidth: 680, textAlign: 'center', marginInline: 'auto' }}>
          <span className="eyebrow" style={{ justifyContent: 'center' }}>Pricing</span>
          <h2 style={{ marginTop: 14 }}>Honest pricing. No tenant fees. No rent skim.</h2>
          <p className="lede" style={{ marginTop: 14, marginInline: 'auto' }}>One flat fee per property. A one-time setup covers your branded site and concierge training.</p>
        </div>
        <div className="price-grid">
          {/* Founding card — featured */}
          <div className="price founding featured">
            <span className="price-tag">FOUNDING COHORT · FIRST 10 HOSTS</span>
            <div className="price-name">Founding</div>
            <div className="price-num"><span className="big">$49</span><span className="unit">/property / month</span></div>
            <div style={{ fontSize: 13.5, color: 'var(--fp-blue)', fontWeight: 500 }}>Your setup and first month are charged only when your first tenant is fully processed. We only get paid when you win.</div>
            <div style={{ marginTop: 8, padding: '14px 16px', background: 'var(--fp-blue-tint)', border: '1px solid var(--border-blue)', borderRadius: 'var(--r-md)', fontSize: 14, lineHeight: 1.55, color: 'var(--ink)' }}>
              <b style={{ display: 'block', marginBottom: 4 }}>Pay nothing today.</b>
              Your setup and first month are charged only when your first tenant is fully processed. I don't eat until you win.
            </div>
            <ul className="price-list">
              <li><b>Lifetime price-lock.</b> Your $49 rate stays locked, even as standard pricing changes.</li>
              <li><b>White-glove setup.</b> We build your branded site and configure your concierge.</li>
              <li>Direct product feedback channel.</li>
              <li>Founding-host badge on your tenant site.</li>
            </ul>
            <div className="price-setup">
              <span>One-time setup</span>
              <span><b style={{ color: 'var(--ink)' }}>$499</b></span>
            </div>
            <div className="price-cta">
              <button className="btn btn-primary btn-lg" style={{ width: '100%' }} onClick={onFoundingCTA}>Claim founding-cohort spot</button>
              <p style={{ textAlign: 'center', marginTop: 10, fontSize: 12.5, color: 'var(--ink-4)', lineHeight: 1.5 }}>$0 at signup, card on file. Your setup and first month are charged once your first tenant is placed. Stripe processing fees pass through at cost.</p>
            </div>
          </div>
          {/* Standard card */}
          <div className="price standard">
            <div className="price-name">Standard</div>
            <div className="price-num"><span className="big">$49</span><span className="unit">/property / month</span></div>
            <div style={{ fontSize: 13.5, color: 'var(--ink-3)' }}>$499 one-time setup. Billed at signup. Standard price subject to change.</div>
            <ul className="price-list">
              <li>Tenant + Host portal</li>
              <li>Live availability calendar</li>
              <li>Recurring rent &amp; payments</li>
              <li>Stay ledger with extensions and pro-rates</li>
              <li>Furnished inventory tracking</li>
              <li>AI concierge trained on your FAQ</li>
            </ul>
            <div className="price-setup">
              <span>One-time setup</span>
              <span><b style={{ color: 'var(--ink)' }}>$499</b></span>
            </div>
            <div className="price-cta">
              <button className="btn btn-secondary btn-lg" style={{ width: '100%' }} onClick={onStandardCTA}>Get started</button>
              <p style={{ textAlign: 'center', marginTop: 10, fontSize: 12.5, color: 'var(--ink-4)' }}>Setup plus first month billed at signup.</p>
            </div>
          </div>
        </div>
        <p style={{ textAlign: 'center', marginTop: 32, fontSize: 13.5, color: 'var(--ink-3)', maxWidth: 720, marginInline: 'auto' }}>
          Both plans are <b style={{ color: 'var(--ink)' }}>$49/property/mo, $499 setup</b>. The founding difference is the <b style={{ color: 'var(--ink)' }}>deferral</b> (you pay nothing until your first tenant is fully processed) and the <b style={{ color: 'var(--ink)' }}>lifetime price-lock</b>. No setup discount. Stripe processing fees pass through at cost.
        </p>
      </div>
    </section>
  )
}

function FAQ() {
  const items = [
    { q: 'How fast can I actually be running stays on this?', a: 'Most hosts launch within a week. If your domain, photos, and Stripe account are ready, same-week setup is possible.' },
    { q: 'Do I own my domain and content?', a: 'Yes, fully. You point your domain at us. If you ever leave, you keep your domain, your content, your tenant data, and your Stripe account. We export everything in standard formats.' },
    { q: 'Are these residential leases?', a: 'No. We do not produce residential leases. We generate furnished MTR leases for 30+ day stays, with the addenda that matter: utilities included, furnishings inventory, pet, parking, and state-specific 30-day protections. Twelve-month and long-term-rental leases are out of scope. Have local counsel sign off the first time, same as you would with any template.' },
    { q: 'Is this a property management service?', a: 'No. We do not manage your properties, screen your tenants, or take a cut of rent. This is an MTR self-management toolset: the operations layer you run yourself instead of paying a manager 20 to 25%.' },
    { q: 'How do you compare to Furnished Finder?', a: 'Furnished Finder is a lead source. Many of our hosts list there and send applicants into FurnishedPortal to qualify, sign, pay, and run the stay. We are not trying to replace it.' },
    { q: "What happens if my $49 rate ever changes?", a: "For founding-cohort hosts, it doesn't. Your $49/property/mo rate is locked for life, even when we raise standard pricing. The only thing that changes is if you add properties at the new standard rate." },
    { q: "How does the AI concierge handle things it doesn't know?", a: "It escalates. The concierge only answers from your FAQ and house docs. Anything outside its scope gets routed to you with full context, so you never get a hallucinated answer to a tenant." },
    { q: 'What about security?', a: 'Stripe processes all payments (we never see card numbers). Tenant data is encrypted at rest. Every lease signature is hashed and time-stamped with an IP audit trail. Per-host data isolation by default.' },
    { q: 'Is there a contract?', a: 'Month-to-month. No annual commitment, no early-termination fee.' },
    { q: "What if it's not working for me?", a: "You don't pay until your first tenant is fully processed. If you get there and it's still not working for you, talk to me and I'll make it right." },
  ]
  const [open, setOpen] = useState(0)
  return (
    <section className="section" id="faq">
      <div className="container">
        <div style={{ maxWidth: 680, marginInline: 'auto', textAlign: 'center' }}>
          <span className="eyebrow" style={{ justifyContent: 'center' }}>FAQ</span>
          <h2 style={{ marginTop: 14 }}>Questions hosts actually ask.</h2>
        </div>
        <div className="faq">
          {items.map((it, i) => (
            <div key={i} className="faq-item" data-open={open === i ? 'true' : 'false'}>
              <div className="faq-q" onClick={() => setOpen(open === i ? -1 : i)}>
                <span>{it.q}</span>
                <span className="faq-chev"><Icon name="chevron" size={16}/></span>
              </div>
              <div className="faq-a">{it.a}</div>
            </div>
          ))}
        </div>
        <p style={{ textAlign: 'center', marginTop: 32, color: 'var(--ink-3)', fontSize: 14 }}>
          Still have questions? Email <a href="mailto:support@furnishedportal.com" style={{ color: 'var(--fp-blue)', fontWeight: 500 }}>support@furnishedportal.com</a>.
        </p>
      </div>
    </section>
  )
}

function FinalCTA({ onFoundingCTA, onDemo }: { onFoundingCTA: () => void; onDemo: () => void }) {
  return (
    <section className="section">
      <div className="container">
        <div className="final-cta">
          <h2>Manage your MTR yourself. Keep the difference.</h2>
          <p className="lede">First 10 founding hosts get $49/property/mo locked for life. PLUS no payment until their first tenant is fully processed.</p>
          <div className="hero-actions">
            <button className="btn btn-primary btn-lg" onClick={onFoundingCTA}>Get Founder Access</button>
            <button className="btn btn-secondary btn-lg" onClick={onDemo}>Try the live demo <Icon name="external" size={15}/></button>
          </div>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-inner">
          <div className="footer-brand">
            <a className="logo" href="/">
              <span className="logo-badge" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/></svg></span>
              <span>FurnishedPortal</span>
            </a>
            <p>The operating system for self-managing MTR hosts.</p>
          </div>
          <div className="footer-col">
            <h5>Product</h5>
            <ul>
              <li><a href="#features">Features</a></li>
              <li><a href="#how">How it works</a></li>
              <li><a href="#compare">Compare</a></li>
              <li><a href="#pricing">Pricing</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h5>Resources</h5>
            <ul>
              <li><a href="#faq">FAQ</a></li>
              <li><a href="mailto:support@furnishedportal.com">support@furnishedportal.com</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h5>Legal</h5>
            <ul>
              <li><a href="/terms">Terms</a></li>
              <li><a href="/privacy">Privacy</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <div>© 2026 FurnishedPortal · Built by an MTR host, for hosts across the US</div>
          <div>Stripe-powered payments · cancel anytime</div>
        </div>
      </div>
    </footer>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function MarketingPage() {
  const [demoOpen, setDemoOpen] = useState(false)
  const openDemo = useCallback(() => setDemoOpen(true), [])
  const closeDemo = useCallback(() => setDemoOpen(false), [])

  const scrollToPricing = useCallback(() => {
    const el = document.getElementById('pricing')
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 70, behavior: 'smooth' })
  }, [])

  const openTally = useCallback(() => {
    window.open(TALLY_URL, '_blank', 'noopener,noreferrer')
  }, [])

  const openStripe = useCallback(() => {
    window.open(STRIPE_STANDARD_URL, '_blank', 'noopener,noreferrer')
  }, [])

  return (
    <div className="fp-mktg">
      <Nav onCTA={scrollToPricing}/>
      <main>
        <HeroSplit onDemo={openDemo} onCTA={scrollToPricing}/>
        <TrustBand/>
        <SixTools/>
        <ProductShowcase/>
        <HowItWorks/>
        <Comparison/>
        <SocialProof/>
        <Founder/>
        <Pricing onFoundingCTA={openTally} onStandardCTA={openStripe}/>
        <FAQ/>
        <FinalCTA onFoundingCTA={openTally} onDemo={openDemo}/>
      </main>
      <Footer/>
      {demoOpen && <DemoModal onClose={closeDemo} onCTA={openTally}/>}
    </div>
  )
}
