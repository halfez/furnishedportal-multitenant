'use client'

import { useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

// ---- Zod schemas matching the server-side schemas ----

const Page1Schema = z.object({
  businessName: z.string().min(1, 'Required'),
  brandName: z.string().min(1, 'Required'),
  ownerFirstName: z.string().min(1, 'Required'),
  ownerLastName: z.string().optional(),
  ownerPhone: z.string().optional(),
  propertyName: z.string().min(1, 'Required'),
  addressLine1: z.string().min(1, 'Required'),
  addressLine2: z.string().optional(),
  city: z.string().min(1, 'Required'),
  state: z.string().length(2, 'Use 2-letter state code'),
  zip: z.string().min(5, 'Required'),
})

const Page2Schema = z.object({
  units: z
    .array(
      z.object({
        identifier: z.string().min(1, 'Required'),
        monthlyRent: z.coerce.number().positive('Must be positive'),
        bedrooms: z.coerce.number().int().min(0).optional(),
        bathrooms: z.coerce.number().min(0).optional(),
        sqft: z.coerce.number().int().positive().optional(),
        description: z.string().optional(),
      }),
    )
    .min(1, 'Add at least one unit'),
})

const Page3Schema = z.object({
  houseRules: z.array(z.object({ text: z.string() })),
  faqCategories: z.array(
    z.object({
      title: z.string().min(1, 'Required'),
      icon: z.string().optional(),
      items: z.array(z.object({ question: z.string(), answer: z.string() })),
    }),
  ),
})

const Page4Schema = z.object({
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Must be a hex color').optional(),
  contactEmail: z.string().email('Invalid email').optional().or(z.literal('')),
  subdomain: z.string().min(1, 'Required').regex(/^[a-z0-9-]+$/, 'Only lowercase letters, numbers, and hyphens'),
  logoUrl: z.string().url().optional().or(z.literal('')),
})

type P1 = z.infer<typeof Page1Schema>
type P2 = z.infer<typeof Page2Schema>
type P3 = z.infer<typeof Page3Schema>
type P4 = z.infer<typeof Page4Schema>

// ---- Helpers ----

const DEFAULT_FAQ: P3['faqCategories'] = [
  {
    title: 'Lease & Payments',
    icon: 'FileText',
    items: [
      { question: 'What is the minimum lease term?', answer: 'Our minimum lease term is 30 days.' },
      { question: 'How do I pay rent?', answer: 'Rent is paid online through our secure tenant portal.' },
    ],
  },
  {
    title: 'Check-In & House Rules',
    icon: 'Home',
    items: [
      { question: 'What time is check-in?', answer: 'Check-in is at 3:00 PM.' },
      { question: 'Are pets allowed?', answer: 'Please contact us to discuss your pet.' },
    ],
  },
]

const DEFAULT_RULES = [
  'No smoking inside the property',
  'Quiet hours from 10 PM to 8 AM',
  'Guests must register with management',
]

async function saveProgress(token: string, page: number, data: Record<string, unknown>) {
  const res = await fetch('/api/provision/questionnaire-save', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, page, data }),
  })
  if (!res.ok) throw new Error('Save failed')
}

// ---- Main component ----

interface Props {
  token: string
  initialPage: number
  initialData: {
    page1: Record<string, unknown> | null
    page2: Record<string, unknown> | null
    page3: Record<string, unknown> | null
    page4: Record<string, unknown> | null
  }
  landlord: {
    ownerFirstName: string
    ownerEmail: string
    subdomain: string
  }
}

export function QuestionnaireClient({ token, initialPage, initialData, landlord }: Props) {
  const [page, setPage] = useState(initialPage)
  const [saving, setSaving] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const p1 = useForm<P1>({ resolver: zodResolver(Page1Schema), defaultValues: (initialData.page1 as P1) ?? { ownerFirstName: landlord.ownerFirstName } })
  const p2 = useForm<P2>({
    resolver: zodResolver(Page2Schema),
    defaultValues: (initialData.page2 as P2) ?? { units: [{ identifier: '', monthlyRent: 0 }] },
  })
  const p3 = useForm<P3>({
    resolver: zodResolver(Page3Schema),
    defaultValues: (initialData.page3 as P3) ?? {
      houseRules: DEFAULT_RULES.map((t) => ({ text: t })),
      faqCategories: DEFAULT_FAQ,
    },
  })
  const p4 = useForm<P4>({
    resolver: zodResolver(Page4Schema),
    defaultValues: (initialData.page4 as P4) ?? {
      primaryColor: '#00798c',
      subdomain: landlord.subdomain,
      contactEmail: landlord.ownerEmail,
    },
  })

  const { fields: unitFields, append: appendUnit, remove: removeUnit } = useFieldArray({ control: p2.control, name: 'units' })
  const { fields: ruleFields, append: appendRule, remove: removeRule } = useFieldArray({ control: p3.control, name: 'houseRules' })

  async function goToPage(target: number, currentData: Record<string, unknown>) {
    setSaving(true)
    try {
      await saveProgress(token, page, currentData)
      setPage(target)
    } catch {
      setSubmitError('Could not save progress. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleSubmit() {
    const valid4 = await p4.trigger()
    if (!valid4) return

    setSaving(true)
    setSubmitError(null)
    try {
      await saveProgress(token, 4, p4.getValues() as Record<string, unknown>)
      const res = await fetch('/api/provision/questionnaire-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Submission failed')
      }
      setDone(true)
    } catch (e: unknown) {
      setSubmitError(e instanceof Error ? e.message : 'Submission failed')
    } finally {
      setSaving(false)
    }
  }

  if (done) {
    return (
      <Shell page={4} total={4}>
        <div className="text-center py-12">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-2xl font-semibold mb-2">Setup submitted!</h2>
          <p className="text-gray-600 mb-6">
            Your information has been saved. Next, connect your Stripe account so you can receive
            tenant payments, then go live.
          </p>
          <a
            href={`https://${p4.getValues('subdomain')}.furnishedportal.com/admin/stripe-connect?token=${token}`}
            className="inline-block bg-fp-primary text-white px-6 py-3 rounded-lg font-semibold"
          >
            Connect Stripe →
          </a>
        </div>
      </Shell>
    )
  }

  return (
    <Shell page={page} total={4}>
      {page === 1 && (
        <Page1Form
          form={p1}
          onNext={async () => {
            const valid = await p1.trigger()
            if (valid) await goToPage(2, p1.getValues() as Record<string, unknown>)
          }}
          saving={saving}
        />
      )}
      {page === 2 && (
        <Page2Form
          form={p2}
          unitFields={unitFields}
          appendUnit={appendUnit}
          removeUnit={removeUnit}
          onBack={() => setPage(1)}
          onNext={async () => {
            const valid = await p2.trigger()
            if (valid) await goToPage(3, { units: p2.getValues('units') } as Record<string, unknown>)
          }}
          saving={saving}
        />
      )}
      {page === 3 && (
        <Page3Form
          form={p3}
          ruleFields={ruleFields}
          appendRule={appendRule}
          removeRule={removeRule}
          onBack={() => setPage(2)}
          onNext={async () => {
            const valid = await p3.trigger()
            if (valid) {
              const d = p3.getValues()
              await goToPage(4, {
                houseRules: d.houseRules.map((r) => r.text),
                faqCategories: d.faqCategories,
              })
            }
          }}
          saving={saving}
        />
      )}
      {page === 4 && (
        <Page4Form
          form={p4}
          onBack={() => setPage(3)}
          onSubmit={handleSubmit}
          saving={saving}
          error={submitError}
        />
      )}
    </Shell>
  )
}

// ---- Shell ----

function Shell({ children, page, total }: { children: React.ReactNode; page: number; total: number }) {
  const titles = ['Property Basics', 'Units', 'House Rules & FAQ', 'Branding & Subdomain']
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <span className="font-semibold text-fp-primary text-lg">FurnishedPortal Setup</span>
          <span className="text-sm text-gray-500">Step {page} of {total}</span>
        </div>
        <div className="max-w-2xl mx-auto px-4 pb-4">
          <div className="flex gap-1">
            {titles.map((t, i) => (
              <div
                key={t}
                className={`h-1.5 flex-1 rounded-full transition-colors ${i + 1 <= page ? 'bg-fp-primary' : 'bg-gray-200'}`}
              />
            ))}
          </div>
          <p className="mt-2 text-sm font-medium text-gray-700">{titles[page - 1]}</p>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-8">{children}</main>
    </div>
  )
}

// ---- Shared field components ----

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  )
}

const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-fp-primary focus:border-transparent outline-none'

function NavButtons({ onBack, onNext, nextLabel = 'Continue', saving }: { onBack?: () => void; onNext: () => void; nextLabel?: string; saving: boolean }) {
  return (
    <div className="flex gap-3 pt-6">
      {onBack && (
        <button type="button" onClick={onBack} className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
          Back
        </button>
      )}
      <button
        type="button"
        onClick={onNext}
        disabled={saving}
        className="ml-auto px-6 py-2.5 bg-fp-primary text-white rounded-lg text-sm font-semibold disabled:opacity-60"
      >
        {saving ? 'Saving…' : nextLabel}
      </button>
    </div>
  )
}

// ---- Page 1: Property Basics ----

function Page1Form({ form, onNext, saving }: { form: ReturnType<typeof useForm<P1>>; onNext: () => void; saving: boolean }) {
  const { register, formState: { errors } } = form
  return (
    <div className="space-y-5">
      <h2 className="text-xl font-semibold text-gray-900">Tell us about your property</h2>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Owner first name" error={errors.ownerFirstName?.message}>
          <input {...register('ownerFirstName')} className={inputCls} />
        </Field>
        <Field label="Owner last name" error={errors.ownerLastName?.message}>
          <input {...register('ownerLastName')} className={inputCls} />
        </Field>
      </div>
      <Field label="Owner phone (optional)" error={errors.ownerPhone?.message}>
        <input {...register('ownerPhone')} type="tel" className={inputCls} />
      </Field>
      <Field label="Business / legal name" error={errors.businessName?.message}>
        <input {...register('businessName')} className={inputCls} placeholder="Acme Rentals LLC" />
      </Field>
      <Field label="Brand name (shown to tenants)" error={errors.brandName?.message}>
        <input {...register('brandName')} className={inputCls} placeholder="Acme Rentals" />
      </Field>
      <hr className="my-2" />
      <h3 className="font-medium text-gray-800">Property address</h3>
      <Field label="Property name" error={errors.propertyName?.message}>
        <input {...register('propertyName')} className={inputCls} placeholder="The Elm Street Apartments" />
      </Field>
      <Field label="Street address" error={errors.addressLine1?.message}>
        <input {...register('addressLine1')} className={inputCls} />
      </Field>
      <Field label="Apt / Suite (optional)" error={errors.addressLine2?.message}>
        <input {...register('addressLine2')} className={inputCls} />
      </Field>
      <div className="grid grid-cols-6 gap-3">
        <div className="col-span-3">
          <Field label="City" error={errors.city?.message}><input {...register('city')} className={inputCls} /></Field>
        </div>
        <div className="col-span-1">
          <Field label="State" error={errors.state?.message}><input {...register('state')} className={inputCls} maxLength={2} placeholder="TX" /></Field>
        </div>
        <div className="col-span-2">
          <Field label="ZIP" error={errors.zip?.message}><input {...register('zip')} className={inputCls} /></Field>
        </div>
      </div>
      <NavButtons onNext={onNext} saving={saving} />
    </div>
  )
}

// ---- Page 2: Units ----

function Page2Form({
  form, unitFields, appendUnit, removeUnit, onBack, onNext, saving,
}: {
  form: ReturnType<typeof useForm<P2>>
  unitFields: Array<{ id: string }>
  appendUnit: (v: P2['units'][number]) => void
  removeUnit: (i: number) => void
  onBack: () => void
  onNext: () => void
  saving: boolean
}) {
  const { register, formState: { errors } } = form
  const unitErrors = errors.units as (typeof errors.units & { [i: number]: Record<string, { message?: string }> }) | undefined
  return (
    <div className="space-y-5">
      <h2 className="text-xl font-semibold text-gray-900">Your units</h2>
      <p className="text-sm text-gray-600">Add each unit you want listed on your site. You can always add more later.</p>
      {unitFields.map((field, i) => (
        <div key={field.id} className="border border-gray-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-medium text-sm text-gray-800">Unit {i + 1}</span>
            {unitFields.length > 1 && (
              <button type="button" onClick={() => removeUnit(i)} className="text-sm text-red-500 hover:underline">Remove</button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Unit identifier" error={unitErrors?.[i]?.identifier?.message}>
              <input {...register(`units.${i}.identifier`)} className={inputCls} placeholder="Apt A / 216 / Unit 1" />
            </Field>
            <Field label="Monthly rent ($)" error={unitErrors?.[i]?.monthlyRent?.message}>
              <input {...register(`units.${i}.monthlyRent`)} type="number" min={0} className={inputCls} />
            </Field>
            <Field label="Bedrooms" error={unitErrors?.[i]?.bedrooms?.message}>
              <input {...register(`units.${i}.bedrooms`)} type="number" min={0} className={inputCls} />
            </Field>
            <Field label="Bathrooms" error={unitErrors?.[i]?.bathrooms?.message}>
              <input {...register(`units.${i}.bathrooms`)} type="number" min={0} step={0.5} className={inputCls} />
            </Field>
            <Field label="Square feet (optional)" error={unitErrors?.[i]?.sqft?.message}>
              <input {...register(`units.${i}.sqft`)} type="number" min={0} className={inputCls} />
            </Field>
          </div>
          <Field label="Description (optional)" error={unitErrors?.[i]?.description?.message}>
            <textarea {...register(`units.${i}.description`)} rows={2} className={inputCls} />
          </Field>
        </div>
      ))}
      <button
        type="button"
        onClick={() => appendUnit({ identifier: '', monthlyRent: 0 })}
        className="w-full border-2 border-dashed border-gray-300 rounded-xl py-3 text-sm text-gray-500 hover:border-fp-primary hover:text-fp-primary transition-colors"
      >
        + Add another unit
      </button>
      <NavButtons onBack={onBack} onNext={onNext} saving={saving} />
    </div>
  )
}

// ---- Page 3: House Rules + FAQ ----

function Page3Form({
  form, ruleFields, appendRule, removeRule, onBack, onNext, saving,
}: {
  form: ReturnType<typeof useForm<P3>>
  ruleFields: ReturnType<typeof useFieldArray>['fields']
  appendRule: (v: { text: string }) => void
  removeRule: (i: number) => void
  onBack: () => void
  onNext: () => void
  saving: boolean
}) {
  const { register } = form
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">House rules</h2>
        <p className="text-sm text-gray-600 mt-1">These appear on your public site and in the lease.</p>
        <div className="mt-3 space-y-2">
          {ruleFields.map((field, i) => (
            <div key={field.id} className="flex gap-2 items-center">
              <input {...register(`houseRules.${i}.text`)} className={`${inputCls} flex-1`} />
              <button type="button" onClick={() => removeRule(i)} className="text-sm text-red-400 hover:text-red-600 px-1">✕</button>
            </div>
          ))}
          <button type="button" onClick={() => appendRule({ text: '' })} className="text-sm text-fp-primary hover:underline mt-1">
            + Add rule
          </button>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold text-gray-900">FAQ seed</h2>
        <p className="text-sm text-gray-600 mt-1">We pre-filled common questions — edit or delete as needed. You can add more from the admin dashboard.</p>
        <FaqEditor form={form} />
      </div>

      <NavButtons onBack={onBack} onNext={onNext} saving={saving} />
    </div>
  )
}

function FaqEditor({ form }: { form: ReturnType<typeof useForm<P3>> }) {
  const { register, control, watch } = form
  const { fields: catFields } = useFieldArray({ control, name: 'faqCategories' })
  return (
    <div className="space-y-4 mt-3">
      {catFields.map((cat, ci) => {
        const items = watch(`faqCategories.${ci}.items`) ?? []
        return (
          <div key={cat.id} className="border border-gray-200 rounded-xl p-4 space-y-3">
            <Field label="Category title">
              <input {...register(`faqCategories.${ci}.title`)} className={inputCls} />
            </Field>
            {items.map((_item, ii) => (
              <div key={ii} className="space-y-1 pl-3 border-l-2 border-gray-100">
                <Field label="Question">
                  <input {...register(`faqCategories.${ci}.items.${ii}.question`)} className={inputCls} />
                </Field>
                <Field label="Answer">
                  <textarea {...register(`faqCategories.${ci}.items.${ii}.answer`)} rows={2} className={inputCls} />
                </Field>
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}

// ---- Page 4: Branding ----

function Page4Form({
  form, onBack, onSubmit, saving, error,
}: {
  form: ReturnType<typeof useForm<P4>>
  onBack: () => void
  onSubmit: () => void
  saving: boolean
  error: string | null
}) {
  const { register, formState: { errors } } = form
  return (
    <div className="space-y-5">
      <h2 className="text-xl font-semibold text-gray-900">Branding & subdomain</h2>
      <Field label="Primary color" error={errors.primaryColor?.message}>
        <div className="flex gap-3 items-center">
          <input {...register('primaryColor')} type="color" className="h-10 w-16 rounded cursor-pointer border border-gray-300" />
          <input {...register('primaryColor')} className={`${inputCls} flex-1`} placeholder="#00798c" />
        </div>
      </Field>
      <Field label="Contact email (shown to tenants)" error={errors.contactEmail?.message}>
        <input {...register('contactEmail')} type="email" className={inputCls} />
      </Field>
      <Field label="Logo URL (optional — you can upload later)" error={errors.logoUrl?.message}>
        <input {...register('logoUrl')} type="url" className={inputCls} placeholder="https://..." />
      </Field>
      <Field label="Your subdomain" error={errors.subdomain?.message}>
        <div className="flex items-center">
          <input {...register('subdomain')} className={`${inputCls} rounded-r-none`} />
          <span className="border border-l-0 border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-500 rounded-r-lg whitespace-nowrap">.furnishedportal.com</span>
        </div>
        <p className="mt-1 text-xs text-gray-500">Only lowercase letters, numbers, and hyphens.</p>
      </Field>
      {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
      <NavButtons onBack={onBack} onNext={onSubmit} nextLabel="Submit setup" saving={saving} />
    </div>
  )
}
