import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Clock, CheckCircle, XCircle, ChevronDown } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import api from '../../lib/api'

const TABS = [
  { key: 'pending',   label: 'Pending' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'completed', label: 'Completed' },
  { key: 'rejected',  label: 'Rejected/Cancelled' },
]

const STATUS_CLS: Record<string, string> = {
  pending:   'bg-amber-100 text-amber-700',
  confirmed: 'bg-green-100 text-green-700',
  completed: 'bg-blue-100 text-blue-700',
  rejected:  'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
  expired:   'bg-gray-100 text-gray-400',
}

function Countdown({ seconds }: { seconds: number }) {
  const [left, setLeft] = useState(Math.max(0, Math.floor(seconds)))
  useEffect(() => {
    if (left <= 0) return
    const t = setInterval(() => setLeft(s => Math.max(0, s - 1)), 1000)
    return () => clearInterval(t)
  }, [])
  if (left <= 0) return <span className="text-red-500 text-xs font-mono">Expired</span>
  const m = Math.floor(left / 60).toString().padStart(2, '0')
  const s = (left % 60).toString().padStart(2, '0')
  return (
    <span className={`text-xs font-mono font-semibold ${left < 300 ? 'text-red-500' : 'text-amber-600'}`}>
      <Clock className="inline h-3 w-3 mr-0.5" />{m}:{s} remaining
    </span>
  )
}

function PendingActions({ r, onRefetch }: { r: any; onRefetch: () => void }) {
  const [note, setNote] = useState('')
  const [showReject, setShowReject] = useState(false)
  const [reason, setReason] = useState('')
  const [confirmingAccept, setConfirmingAccept] = useState(false)

  const confirmMut = useMutation({
    mutationFn: () => api.put(`/reservations/${r.id}/confirm`, { note: note || undefined }),
    onSuccess: () => { toast.success('Reservation confirmed'); onRefetch() },
    onError: (err: any) => toast.error(err?.response?.data?.detail ?? 'Error'),
  })

  const rejectMut = useMutation({
    mutationFn: () => api.put(`/reservations/${r.id}/reject`, { reason }),
    onSuccess: () => { toast.success('Reservation rejected'); onRefetch() },
    onError: (err: any) => toast.error(err?.response?.data?.detail ?? 'Error'),
  })

  return (
    <div className="mt-3 space-y-2">
      <input
        value={note}
        onChange={e => setNote(e.target.value)}
        placeholder="Add a note for customer (optional)..."
        className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400"
      />
      <div className="flex gap-2">
        {!confirmingAccept ? (
          <button onClick={() => setConfirmingAccept(true)}
            className="flex-1 py-2 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 transition">
            ✓ Confirm
          </button>
        ) : (
          <div className="flex-1 flex gap-1">
            <button onClick={() => confirmMut.mutate()} disabled={confirmMut.isLoading}
              className="flex-1 py-2 bg-green-600 text-white text-xs font-semibold rounded-lg disabled:opacity-40">Yes, Confirm</button>
            <button onClick={() => setConfirmingAccept(false)}
              className="px-3 py-2 border border-gray-300 text-xs rounded-lg">No</button>
          </div>
        )}
        <button onClick={() => setShowReject(!showReject)}
          className="flex-1 py-2 bg-red-50 text-red-600 border border-red-200 text-xs font-semibold rounded-lg hover:bg-red-100 transition">
          ✗ Reject
        </button>
      </div>

      {showReject && (
        <div className="space-y-1">
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Reason for rejection (min 10 characters)..."
            rows={2}
            maxLength={200}
            className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-400"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">{reason.length}/200</span>
            <button
              disabled={reason.length < 10 || rejectMut.isLoading}
              onClick={() => rejectMut.mutate()}
              className="text-xs px-3 py-1.5 bg-red-600 text-white rounded-lg disabled:opacity-40 hover:bg-red-700 transition"
            >
              Confirm Rejection
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function ConfirmedActions({ r, onRefetch }: { r: any; onRefetch: () => void }) {
  const [confirming, setConfirming] = useState(false)

  const completeMut = useMutation({
    mutationFn: () => api.put(`/reservations/${r.id}/complete`),
    onSuccess: () => { toast.success('Marked as completed'); onRefetch() },
    onError: (err: any) => toast.error(err?.response?.data?.detail ?? 'Error'),
  })

  return (
    <div className="mt-3">
      {r.countdown_seconds != null && <Countdown seconds={r.countdown_seconds} />}
      <div className="mt-2 flex gap-2">
        {!confirming ? (
          <button onClick={() => setConfirming(true)}
            className="text-xs px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold">
            Mark as Completed
          </button>
        ) : (
          <div className="flex gap-2 items-center">
            <span className="text-xs text-gray-600">Customer picked up?</span>
            <button onClick={() => completeMut.mutate()} disabled={completeMut.isLoading}
              className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg disabled:opacity-40">Yes</button>
            <button onClick={() => setConfirming(false)}
              className="text-xs px-3 py-1.5 border border-gray-300 rounded-lg">No</button>
          </div>
        )}
      </div>
    </div>
  )
}

function ReservationCard({ r, onRefetch }: { r: any; onRefetch: () => void }) {
  const item = r.items?.[0] ?? {}
  const badge = STATUS_CLS[r.status] ?? 'bg-gray-100 text-gray-500'

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex gap-3">
        <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 shrink-0">
          {item.image_url
            ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center text-xl">📦</div>
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-sm text-gray-900 truncate">{item.name}</p>
              <p className="text-xs text-gray-500">Qty: {item.quantity} · ₹{Number(r.total_value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${badge}`}>
              {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
          </p>
          {r.vendor_note && (
            <p className="text-xs italic text-gray-500 mt-1">Note: {r.vendor_note}</p>
          )}
        </div>
      </div>

      {r.status === 'pending' && <PendingActions r={r} onRefetch={onRefetch} />}
      {r.status === 'confirmed' && <ConfirmedActions r={r} onRefetch={onRefetch} />}
    </div>
  )
}

export default function VendorReservationsPage() {
  const [tab, setTab] = useState('pending')

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['vendor-reservations', tab],
    queryFn: () => {
      const statusMap: Record<string, string[]> = {
        rejected: ['rejected', 'cancelled'],
      }
      const status = statusMap[tab] ? undefined : tab
      return api.get('/reservations/vendor', { params: { status, limit: 50 } }).then(r => r.data)
    },
    refetchInterval: 30000,
  })

  const allRes: any[] = data?.reservations ?? []
  const filtered = tab === 'rejected'
    ? allRes.filter(r => ['rejected', 'cancelled'].includes(r.status))
    : allRes.filter(r => r.status === tab)

  const pendingCount = tab !== 'pending' ? 0 : filtered.length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Reservations</h1>
        {pendingCount > 0 && (
          <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full">
            {pendingCount} pending
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition -mb-px ${
              tab === t.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="bg-white border border-gray-200 rounded-xl p-4 h-24 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">📋</p>
          <p className="font-medium">No {tab} reservations</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(r => (
            <ReservationCard key={r.id} r={r} onRefetch={refetch} />
          ))}
        </div>
      )}
    </div>
  )
}
