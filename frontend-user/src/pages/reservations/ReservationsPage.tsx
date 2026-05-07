import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle, Clock, XCircle, MapPin, MessageSquare, ChevronRight, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { useNavigate } from 'react-router-dom'
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
  }, [seconds])

  if (left <= 0) return <span className="text-red-500 text-xs font-semibold uppercase">Expired</span>
  const m = Math.floor(left / 60).toString().padStart(2, '0')
  const s = (left % 60).toString().padStart(2, '0')
  const urgent = left < 300

  return (
    <span className={`text-xs font-mono font-bold flex items-center gap-1 ${urgent ? 'text-red-500 animate-pulse' : 'text-amber-600'}`}>
      <Clock className="h-3.3 w-3.5" />
      {m}:{s}
    </span>
  )
}

function ReservationCard({ r, onRefetch }: { r: any; onRefetch: () => void }) {
  const navigate = useNavigate()
  const [cancelling, setCancelling] = useState(false)

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

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow duration-300 space-y-4">
      <div className="flex gap-4">
        {/* Image Section */}
        <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-50 shrink-0 border border-gray-100">
          {item.image_url ? (
            <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>
          )}
        </div>

        {/* Info Section */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-gray-900 truncate leading-tight">{item.name ?? 'Product'}</h3>
            <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0 ${badge.cls}`}>
              {badge.label}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1 font-medium">
            Qty: {item.quantity} · Total: <span className="text-gray-900 font-bold">₹{Number(r.total_value).toLocaleString('en-IN')}</span>
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] text-gray-400">
              {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
            </span>
            {isActive && r.countdown_seconds != null && (
              <>
                <span className="text-gray-300">·</span>
                <Countdown seconds={r.countdown_seconds} />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Footer / Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-50">
        <div className="flex gap-2">
          {r.status === 'confirmed' && (
            <>
              <button
                onClick={() => navigate('/chat')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 transition"
              >
                <MessageSquare className="h-3.5 w-3.5" /> Chat
              </button>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(r.vendor_id || 'store')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 text-gray-600 rounded-lg text-xs font-bold hover:bg-gray-100 transition"
              >
                <MapPin className="h-3.5 w-3.5" /> Location
              </a>
            </>
          )}
        </div>

        <div className="flex gap-2">
          {isActive && (
            <>
              {!cancelling ? (
                <button onClick={() => setCancelling(true)}
                  className="text-xs font-bold text-gray-400 hover:text-red-500 transition px-2 py-1">
                  Cancel
                </button>
              ) : (
                <div className="flex items-center gap-2 bg-red-50 px-2 py-1 rounded-lg">
                  <span className="text-[10px] font-bold text-red-600 uppercase">Sure?</span>
                  <button onClick={() => cancelMutation.mutate()}
                    disabled={cancelMutation.isLoading}
                    className="text-[10px] font-bold text-red-600 hover:underline disabled:opacity-40">Yes</button>
                  <button onClick={() => setCancelling(false)}
                    className="text-[10px] font-bold text-gray-400 hover:underline">No</button>
                </div>
              )}
            </>
          )}
          <button className="p-1.5 hover:bg-gray-50 rounded-lg text-gray-300">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {r.vendor_note && (
        <div className="mt-2 p-2 bg-amber-50 rounded-lg border border-amber-100">
          <p className="text-[10px] text-amber-800 leading-normal">
            <span className="font-bold uppercase mr-1">Vendor Note:</span>
            {r.vendor_note}
          </p>
        </div>
      )}
    </div>
  )
}

export default function ReservationsPage() {
  const [tab, setTab] = useState('active')
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['user-reservations'],
    queryFn: () => api.get('/reservations/user', { params: { limit: 100 } }).then(r => r.data),
    refetchInterval: 15000,
  })

  const tabDef = TABS.find(t => t.key === tab)!
  const allReservations: any[] = data?.reservations ?? []
  const filtered = allReservations.filter(r => tabDef.statuses.includes(r.status))

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-20">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">My Reservations</h1>
        <button onClick={() => refetch()} className="p-2 hover:bg-gray-100 rounded-full transition">
          <Clock className={`h-4 w-4 text-gray-400 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-gray-100/50 rounded-2xl">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all duration-200 uppercase tracking-wider ${
              tab === t.key 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* List Content */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white border border-gray-100 rounded-2xl p-4 h-32 animate-pulse shadow-sm" />
          ))}
        </div>
      ) : isError ? (
        <div className="text-center py-20 bg-red-50 rounded-3xl border border-red-100">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-3" />
          <p className="text-red-800 font-bold">Failed to load reservations</p>
          <button onClick={() => refetch()} className="mt-4 text-sm font-bold text-red-600 hover:underline">Try Again</button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24 bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-100">
          <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-4">
            <ShoppingBag className="h-8 w-8 text-gray-200" />
          </div>
          <p className="font-bold text-gray-400 uppercase tracking-widest text-xs">No {tab} reservations</p>
          <button
            onClick={() => navigate('/search')}
            className="mt-6 px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl text-xs hover:bg-blue-700 transition shadow-md"
          >
            Discover Products
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(r => (
            <ReservationCard key={r.id} r={r} onRefetch={() => refetch()} />
          ))}
        </div>
      )}
    </div>
  )
}
