import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import api from '../../lib/axios'

interface Props {
  product: any
  open: boolean
  onClose: () => void
}

export default function GroupReservationModal({ product, open, onClose }: Props) {
  const navigate = useNavigate()
  const [groupName, setGroupName] = useState('')
  const [emailInput, setEmailInput] = useState('')
  const [emails, setEmails] = useState<string[]>([])
  const [result, setResult] = useState<any>(null)
  const [copied, setCopied] = useState(false)

  const addEmail = () => {
    const e = emailInput.trim()
    if (e && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e) && !emails.includes(e)) {
      setEmails(p => [...p, e])
      setEmailInput('')
    }
  }

  const mutation = useMutation({
    mutationFn: () =>
      api.post('/reservations/group/', {
        store_id: product.store_id ?? product.vendor_id,
        group_name: groupName,
        items: [{ product_id: product.id, quantity: 1 }],
        invite_emails: emails,
      }),
    onSuccess: data => {
      setResult(data.data)
      toast.success('Group reservation created!')
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail ?? 'Failed to create group'),
  })

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg text-gray-900">Start Group Reservation</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {result ? (
          <div className="space-y-4 text-center">
            <div className="text-green-500 text-4xl">✅</div>
            <p className="font-semibold text-gray-800">Group "{result.group_name}" created!</p>
            <p className="text-sm text-gray-500">Share the group link with your friends:</p>
            <div className="flex gap-2">
              <input readOnly value={`${window.location.origin}/groups/${result.id}`}
                className="flex-1 text-xs border border-gray-200 rounded-lg px-3 py-2 bg-gray-50" />
              <button
                onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/groups/${result.id}`); setCopied(true) }}
                className="px-3 py-2 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition"
              >
                {copied ? '✓' : 'Copy'}
              </button>
            </div>
            <button onClick={onClose}
              className="w-full py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition">
              Close
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                {product.images?.[0] ? (
                  <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                ) : <div className="w-full h-full flex items-center justify-center text-xl">📦</div>}
              </div>
              <div>
                <p className="font-medium text-sm text-gray-900 truncate">{product.name}</p>
                <p className="text-xs text-gray-500">Qty: 1</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Group Name</label>
                <input
                  value={groupName}
                  onChange={e => setGroupName(e.target.value)}
                  placeholder="e.g. Weekend groceries"
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Invite Friends</label>
                <div className="flex gap-2">
                  <input
                    value={emailInput}
                    onChange={e => setEmailInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addEmail())}
                    placeholder="friend@email.com"
                    className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button onClick={addEmail}
                    className="px-3 py-2 bg-blue-50 text-blue-600 text-sm font-medium rounded-xl hover:bg-blue-100 transition">
                    Add
                  </button>
                </div>
                {emails.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {emails.map(e => (
                      <span key={e} className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
                        {e}
                        <button onClick={() => setEmails(p => p.filter(x => x !== e))}>
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <button
              disabled={!groupName.trim() || mutation.isLoading}
              onClick={() => mutation.mutate()}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 disabled:opacity-40 transition"
            >
              {mutation.isLoading ? 'Creating…' : 'Create Group'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
