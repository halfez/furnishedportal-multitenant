'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface FaqItem {
  id: string
  question: string
  answer: string
  sortOrder: number
}

interface FaqCategory {
  id: string
  title: string
  icon: string
  sortOrder: number
  items: FaqItem[]
}

export default function AdminFaqPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [categories, setCategories] = useState<FaqCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [newCatTitle, setNewCatTitle] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/tenant/login')
    if (status === 'authenticated') {
      if (session.user.role !== 'admin' && session.user.role !== 'owner') {
        router.push('/')
      } else {
        fetchCategories()
      }
    }
  }, [status, session])

  async function fetchCategories() {
    setLoading(true)
    const res = await fetch('/api/admin/faq/categories', {
      headers: { 'x-admin-session': 'true' },
    })
    if (res.ok) setCategories(await res.json())
    setLoading(false)
  }

  async function addCategory() {
    if (!newCatTitle.trim()) return
    const res = await fetch('/api/admin/faq/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-session': 'true' },
      body: JSON.stringify({ title: newCatTitle }),
    })
    if (res.ok) {
      setNewCatTitle('')
      fetchCategories()
    }
  }

  async function deleteCategory(id: string) {
    await fetch(`/api/admin/faq/categories/${id}`, {
      method: 'DELETE',
      headers: { 'x-admin-session': 'true' },
    })
    fetchCategories()
  }

  if (loading) return <div className="p-8 text-fp-text-light">Loading...</div>

  return (
    <div className="min-h-screen bg-fp-bg p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-fp-text">FAQ Editor</h1>
          <a href="/admin" className="text-sm text-fp-text-light hover:text-fp-teal">
            Back to dashboard
          </a>
        </div>

        {/* Add category */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6 flex gap-3">
          <input
            type="text"
            value={newCatTitle}
            onChange={(e) => setNewCatTitle(e.target.value)}
            placeholder="New category name"
            className="flex-1 border border-gray-200 rounded px-3 py-2 text-sm"
            onKeyDown={(e) => e.key === 'Enter' && addCategory()}
          />
          <button
            onClick={addCategory}
            className="bg-fp-teal text-white px-4 py-2 rounded text-sm font-medium hover:bg-fp-teal-hover"
          >
            Add Category
          </button>
        </div>

        {categories.map((cat) => (
          <div key={cat.id} className="bg-white rounded-xl shadow-sm p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-fp-text">{cat.title}</h2>
              <button
                onClick={() => deleteCategory(cat.id)}
                className="text-red-400 text-xs hover:text-red-600"
              >
                Delete category
              </button>
            </div>
            <ul className="space-y-2">
              {cat.items.map((item) => (
                <li key={item.id} className="border-l-2 border-fp-teal pl-3">
                  <div className="font-medium text-sm text-fp-text">{item.question}</div>
                  <div className="text-xs text-fp-text-light mt-0.5">{item.answer}</div>
                </li>
              ))}
            </ul>
          </div>
        ))}

        {categories.length === 0 && (
          <p className="text-fp-text-light text-sm">No categories yet. Add one above.</p>
        )}
      </div>
    </div>
  )
}
