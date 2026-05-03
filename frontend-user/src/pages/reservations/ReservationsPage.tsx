import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle, Clock, XCircle, MapPin, Star, X } from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import api from '../../lib/axios'

const TABS = [
  { key: 'active', label: 'Active', statuses: ['pending', 'confirmed'] },
  { key: 'past', label: 'Past', statuses: ['completed', 'expired'] },
  { key: 'cancelled', label: 'Cancelled', statuses: ['cancelled', 'rejected'] },
]

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  pending:   { label: 'Pending',   cls: 'bg-amber-100 text-amber-700' },
  confirmed: { label: 'Confirmed', cls: 'bg-green-100 text-green-700' },
  completed: { label: 'Completed', cls: 'bg-blue-100 text-blue-700' },
  rejected:  { label: 'Rejected',  cls: 'bg-red-100 text-red-700' },
  cancelled: { label: 'Cancelled', cls: 'bg-gray-100 text-gray-600' },
  expired:   { label: 'Expired',   cls: 'bg-gray-100 text-gray-500' },
}

function Countdown({ seconds }: { seconds: number }) {
  const [left, setLeft] = useState(Math.max(0, Math.floor(seconds)))
  useEffect(() => {
    if (left <= 0) return
    const t = setInterval(() => setLeft(s => Math.max(0, s - 1)), 1000)
    return () => clearInterval(t)
  }, [])
  if (left <= 0) return <span className="text-red-500 text-xs font-semibold">Expired</span>
  const m = Math.floor(left / 60).toString().padStart(2, '0')
  const s = (left % 60).toString().padStart(2, '0')
  const urgent = left < 300
  return (
    <span className={`text-xs font-mono font-semibold flex items-center gap-1 ${urgent ? 'text-red-500' : 'text-amber-600'}`}>
      <Clock className="h-3 w-3" />
      {m}:{s}
    </span>
  )
}

function ReviewSection({ reservationId, productId, storeId }: { reservationId: string; productId: string; storeId?: string }) {
  const [type, setType] = useState<'product' | 'store' | null>(null)
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submitted, setSubmitted] = useState<string[]>([])
  const qc = useQueryClient()

  const reviewMutation = useMutation({
    mutationFn: (targetType: 'product' | 'store') =>
      api.post('/reviews/', {
        target_id: targetType === 'product' ? productId : storeId,
        target_type: targetType,
        rating,
        comment,
        reservation_id: reservationId,
      }),
    onSuccess: (_, targetType) => {
      toast.success(`${targetType === 'product' ? 'Product' : 'Store'} review submitted!`)
      setSubmitted(p => [...p, targetType])
      setRating(0)
      setComment('')
      setType(null)
      qc.invalidateQueries({ queryKey: ['user-reservations'] })
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail ?? 'Failed to submit review'),
  })

  return (
    <div className="mt-3 pt-3 border-t border-gray-100">
      <p className="text-xs font-semibold text-gray-600 mb-2">Leave a Review</p>
      <div className="flex gap-2 flex-wrap">
        {!submitted.includes('product') && (
          <button onClick={() => setType('product')}
            className="text-xs px-3 py-1.5 border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 transition">
            Rate Product
          </button>
        )}
        {storeId && !submitted.includes('store') && (
          <button onClick={() => setType('store')}
            className="text-xs px-3 py-1.5 border border-purple-300 text-purple-600 rounded-lg hover:bg-purple-50 transition">
            Rate Store
          </button>
        )}
      </div>

      {type && (
        <div className="mt-2 space-y-2">
          <div className="flex gap-1">
            {[1,2,3,4,5].map(s => (
              <button key={s} onClick={() => setRating(s)}>
                <Star className={`h-5 w-5 transition ${s <= rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`} />
              </button>
            ))}
          </div>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Write your review..."
            rows={2}
            className="w-full text-xs border border-gray-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <div className="flex gap-2">
            <button
              disabled={rating === 0 || comment.length < 5 || reviewMutation.isLoading}
              onClick={() => reviewMutation.mutate(type)}
              className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg disabled:opacity-40 hover:bg-blue-700 transition"
            >
              Submit {type === 'product' ? 'Product' : 'Store'} Review
            </button>
            <button onClick={() => setType(null)} className="text-xs text-gray-500 hover:text-gray-700">
              Cancel
            </button>
          </div>
        </div>
      )}
      {submitted.length > 0 && (
        <p className="text-xs text-green-600 mt-1">✓ Review{submitted.length > 1 ? 's' : ''} submitted</p>
      )}
    </div>
  )
}

function ReservationCard({ r, onRefetch }: { r: any; onRefetch: () => void }) {
  const [cancelling, setCancelling] = useState(false)
  const qc = useQueryClient()

  const cancelMutation = useMutation({
    mutationFn: () => api.put(`/reservations/${r.id}/cancel`),
    onSuccess: () => {
      toast.success('Reservation cancelled')
      onRefetch()
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail ?? 'Failed to cancel'),
  })

  const item = r.items?.[0] ?? {}
  const badge = STATUS_BADGE[r.status] ?? { label: r.status, cls: 'bg-gray-100 text-gray-500' }
  const isActive = ['pending', 'confirmed'].includes(r.status)
  const storeId = r.store_id

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
      <div className="flex gap-3">
        {/* Image */}
        <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-100 shrink-0">
          {item.image_url ? (
            <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>
          )}
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-sm text-gray-900 truncate">{item.name ?? 'Product'}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${badge.cls}`}>
              {badge.label}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Qty: {item.quantity} · Total: ₹{Number(r.total_value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
          </p>
          {r.vendor_note && (
            <p className="text-xs italic text-gray-500 mt-1">Note: {r.vendor_note}</p>
          )}
        </div>
      </div>

      {/* Countdown */}
      {isActive && r.countdown_seconds != null && (
        <div className="flex items-center gap-2">
          <Countdown seconds={r.countdown_seconds} />
          <span className="text-xs text-gray-400">remaining</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        {r.status === 'confirmed' && (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('store')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            <MapPin className="h-3 w-3" /> Get Directions
          </a>
        )}
        {isActive && (
          <>
            {!cancelling ? (
              <button onClick={() => setCancelling(true)}
                className="text-xs px-3 py-1.5 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition">
                Cancel
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600">Confirm cancel?</span>
                <button onClick={() => cancelMutation.mutate()}
                  disabled={cancelMutation.isLoading}
                  className="text-xs px-2 py-1 bg-red-600 text-white rounded disabled:opacity-40">Yes</button>
                <button onClick={() => setCancelling(false)}
                  className="text-xs px-2 py-1 border border-gray-300 rounded">No</button>
              </div>
            )}
          </>
        )}
      </div>

      {r.status === 'completed' && (
        <ReviewSection
          reservationId={r.id}
          productId={item.product_id}
          storeId={storeId}
        />
      )}
    </div>
  )
}

export default function ReservationsPage() {
  const [tab, setTab] = useState('active')
  const tabDef = TABS.find(t => t.key === tab)!
  const qc = useQueryClient()

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['user-reservations', tab],
    queryFn: () => {
      const params = new URLSearchParams({ limit: '50' })
      return api.get('/reservations/user', { params }).then(r => r.data)
    },
  })

  const allReservations: any[] = data?.reservations ?? []
  const filtered = allReservations.filter(r => tabDef.statuses.includes(r.status))

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900">My Reservations</h1>

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

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="bg-white border border-gray-200 rounded-xl p-4 h-24 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">📋</p>
          <p className="font-medium">No {tab} reservations</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(r => (
            <ReservationCard key={r.id} r={r} onRefetch={() => refetch()} />
          ))}
        </div>
      )}
    </div>
  )
}
