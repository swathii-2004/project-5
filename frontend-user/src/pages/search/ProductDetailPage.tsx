import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { MapPin, Heart, Star, Minus, Plus, ShoppingBag, Users, X } from 'lucide-react'
import { toast } from 'sonner'
import api from '../../lib/api'
import { useAuthStore } from '../../store/authStore'
import GroupReservationModal from '../reservations/GroupReservationModal'

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(s => (
        <Star key={s} className={`h-4 w-4 ${s <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`} />
      ))}
    </div>
  )
}

function ReservationModal({ product, onClose }: { product: any; onClose: () => void }) {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [qty, setQty] = useState(1)
  const [phone, setPhone] = useState(user?.phone ?? '')
  const available = product.available_qty ?? product.stock

  const mutation = useMutation({
    mutationFn: () =>
      api.post('/reservations/', {
        product_id: product.id,
        store_id: product.store_id ?? product.vendor_id,
        quantity: qty,
        pickup_contact_phone: phone,
      }),
    onSuccess: () => {
      toast.success('Reservation created!')
      onClose()
      navigate('/reservations')
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail ?? 'Failed to reserve'),
  })

  const total = Number(product.price) * qty

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg text-gray-900">Reserve Item</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X className="h-5 w-5 text-gray-500" /></button>
        </div>

        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
          <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-100 shrink-0">
            {product.images?.[0]
              ? <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>
            }
          </div>
          <div>
            <p className="font-medium text-sm text-gray-900">{product.name}</p>
            <p className="text-xs text-gray-500">{available} available</p>
          </div>
        </div>

        {/* Quantity */}
        <div>
          <label className="text-xs font-medium text-gray-700 block mb-1">Quantity</label>
          <div className="flex items-center gap-3">
            <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
              <button disabled={qty <= 1} onClick={() => setQty(q => q - 1)}
                className="p-2.5 hover:bg-gray-100 disabled:opacity-40 transition">
                <Minus className="h-4 w-4" />
              </button>
              <span className="px-5 text-sm font-semibold min-w-[3rem] text-center">{qty}</span>
              <button disabled={qty >= available} onClick={() => setQty(q => q + 1)}
                className="p-2.5 hover:bg-gray-100 disabled:opacity-40 transition">
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <span className="text-sm font-bold text-gray-900">
              ₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Phone */}
        <div>
          <label className="text-xs font-medium text-gray-700 block mb-1">Pickup Contact Phone</label>
          <input
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="10-digit phone number"
            maxLength={15}
            className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {phone.length > 0 && phone.replace(/\D/g, '').length < 10 && (
            <p className="text-xs text-red-500 mt-1">Enter at least 10 digits</p>
          )}
        </div>

        <button
          disabled={phone.replace(/\D/g, '').length < 10 || mutation.isLoading}
          onClick={() => mutation.mutate()}
          className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 disabled:opacity-40 transition flex items-center justify-center gap-2"
        >
          <ShoppingBag className="h-4 w-4" />
          {mutation.isLoading ? 'Reserving…' : 'Confirm Reservation'}
        </button>
      </div>
    </div>
  )
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const [activeImg, setActiveImg] = useState(0)
  const [wishlisted, setWishlisted] = useState(false)
  const [showReserve, setShowReserve] = useState(false)
  const [showGroup, setShowGroup] = useState(false)

  const { data: product, isLoading, isError } = useQuery({
    queryKey: ['product', id],
    queryFn: () => api.get(`/products/${id}`).then(r => r.data),
    onSuccess: (p: any) => {
      if (user) {
        api.get('/wishlist/').then(r => {
          setWishlisted(r.data.some((w: any) => w.product?.id === p.id))
        }).catch(() => {})
      }
    }
  })

  const { data: reviewsData } = useQuery({
    queryKey: ['reviews-product', id],
    queryFn: () => api.get(`/reviews/product/${id}`).then(r => r.data),
  })

  const wishlistMutation = useMutation({
    mutationFn: () =>
      wishlisted
        ? api.delete(`/wishlist/${id}`)
        : api.post('/wishlist/', { product_id: id, notify_on_restock: true, notify_on_price_drop: true }),
    onSuccess: () => {
      setWishlisted(w => !w)
      toast.success(wishlisted ? 'Removed from wishlist' : 'Added to wishlist')
      qc.invalidateQueries({ queryKey: ['wishlist'] })
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail ?? 'Failed'),
  })

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8 animate-pulse">
        <div className="aspect-square bg-gray-200 rounded-2xl" />
        <div className="space-y-4 py-4">{[1,2,3,4].map(i => <div key={i} className="h-6 bg-gray-200 rounded w-full" />)}</div>
      </div>
    )
  }

  if (isError || !product) {
    return (
      <div className="text-center py-24 text-gray-500">
        <p className="text-5xl mb-4">😕</p>
        <p className="font-semibold text-lg">Product not found</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-blue-600 hover:underline text-sm">← Go back</button>
      </div>
    )
  }

  const images: string[] = product.images ?? []
  const available = product.available_qty ?? (product.stock - (product.reserved_qty ?? 0))
  const outOfStock = available <= 0

  return (
    <div className="max-w-5xl mx-auto space-y-10">
      {showReserve && <ReservationModal product={product} onClose={() => setShowReserve(false)} />}
      {showGroup && <GroupReservationModal product={product} open={showGroup} onClose={() => setShowGroup(false)} />}

      <div className="grid md:grid-cols-2 gap-8">
        {/* Image gallery */}
        <div className="space-y-3">
          <div className="aspect-square rounded-2xl overflow-hidden bg-gray-100 border border-gray-200">
            {images[activeImg]
              ? <img src={images[activeImg]} alt={product.name} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-6xl text-gray-300">📦</div>
            }
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {images.map((img, i) => (
                <button key={i} onClick={() => setActiveImg(i)}
                  className={`shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition ${activeImg === i ? 'border-blue-500' : 'border-transparent'}`}>
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-4 py-2">
          <div className="flex items-center gap-1.5 text-sm text-gray-500">
            <MapPin className="h-4 w-4" />
            <span>{product.store_name ?? 'Unknown Store'}</span>
            {product.city && <span>· {product.city}</span>}
          </div>

          <h1 className="text-2xl font-bold text-gray-900 leading-snug">{product.name}</h1>

          {product.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {product.tags.map((tag: string) => (
                <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">#{tag}</span>
              ))}
            </div>
          )}

          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold text-gray-900">
              ₹{Number(product.discounted_price ?? product.price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
            {product.discounted_price && (
              <span className="text-lg text-gray-400 line-through">
                ₹{Number(product.price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            )}
          </div>

          {outOfStock
            ? <span className="inline-block text-sm font-medium px-3 py-1 rounded-full bg-red-100 text-red-700">Out of Stock</span>
            : available <= 10
              ? <span className="inline-block text-sm font-medium px-3 py-1 rounded-full bg-amber-100 text-amber-700">Only {available} left</span>
              : <span className="inline-block text-sm font-medium px-3 py-1 rounded-full bg-green-100 text-green-700">In Stock</span>
          }

          <p className="text-gray-600 text-sm leading-relaxed">{product.description}</p>

          {/* Actions row */}
          <div className="flex items-center gap-2">
            <button
              disabled={outOfStock}
              onClick={() => setShowReserve(true)}
              className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
            >
              <ShoppingBag className="h-4 w-4" />
              Reserve
            </button>

            {user && (
              <button
                onClick={() => wishlistMutation.mutate()}
                disabled={wishlistMutation.isLoading}
                className={`p-3 rounded-xl border transition ${wishlisted ? 'border-red-300 bg-red-50 text-red-500' : 'border-gray-300 text-gray-500 hover:border-red-300 hover:text-red-400'}`}
              >
                <Heart className={`h-5 w-5 ${wishlisted ? 'fill-red-500' : ''}`} />
              </button>
            )}
          </div>

          {/* Group Reservation */}
          {!outOfStock && (
            <button
              onClick={() => setShowGroup(true)}
              className="w-full py-2.5 rounded-xl border border-purple-300 text-purple-600 text-sm font-medium hover:bg-purple-50 transition flex items-center justify-center gap-2"
            >
              <Users className="h-4 w-4" />
              Start Group Reservation
            </button>
          )}
        </div>
      </div>

      {/* Reviews */}
      <div className="border-t border-gray-200 pt-8 space-y-4">
        <h2 className="text-lg font-bold text-gray-900">
          Customer Reviews {reviewsData?.total > 0 && <span className="text-sm font-normal text-gray-500">({reviewsData.total})</span>}
        </h2>
        {reviewsData?.reviews?.length > 0 ? (
          <div className="space-y-4">
            {reviewsData.reviews.map((r: any) => (
              <div key={r.id} className="bg-white border border-gray-200 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm text-gray-800">{r.reviewer_name}</span>
                  <span className="text-xs text-gray-400">{new Date(r.created_at).toLocaleDateString('en-IN')}</span>
                </div>
                <StarRating rating={r.rating} />
                {r.comment && <p className="text-sm text-gray-600">{r.comment}</p>}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-sm">No reviews yet.</p>
        )}
      </div>
    </div>
  )
}
