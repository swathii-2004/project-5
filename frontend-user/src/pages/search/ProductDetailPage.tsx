import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { MapPin, Heart, Star, Minus, Plus, ShoppingBag } from 'lucide-react'
import { toast } from 'sonner'
import api from '../../lib/api'
import { useAuthStore } from '../../store/authStore'

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <Star
          key={s}
          className={`h-4 w-4 ${s <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`}
        />
      ))}
    </div>
  )
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const [activeImg, setActiveImg] = useState(0)
  const [qty, setQty] = useState(1)
  const [wishlisted, setWishlisted] = useState(false)

  const { data: product, isLoading, isError } = useQuery({
    queryKey: ['product', id],
    queryFn: () => api.get(`/products/${id}`).then(r => r.data),
    onSuccess: (p: any) => {
      // Check if already wishlisted
      if (user) {
        api.get('/wishlist/').then(r => {
          const found = r.data.some((w: any) => w.product?.id === id || w.product?.id === p.id)
          setWishlisted(found)
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
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail ?? 'Failed to update wishlist')
    },
  })

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8 animate-pulse">
        <div className="aspect-square bg-gray-200 rounded-2xl" />
        <div className="space-y-4 py-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-6 bg-gray-200 rounded w-full" />
          ))}
        </div>
      </div>
    )
  }

  if (isError || !product) {
    return (
      <div className="text-center py-24 text-gray-500">
        <p className="text-5xl mb-4">😕</p>
        <p className="font-semibold text-lg">Product not found</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-blue-600 hover:underline text-sm">
          ← Go back
        </button>
      </div>
    )
  }

  const images: string[] = product.images ?? []
  const available = product.available_qty ?? (product.stock - (product.reserved_qty ?? 0))
  const outOfStock = available <= 0

  return (
    <div className="max-w-5xl mx-auto space-y-10">
      <div className="grid md:grid-cols-2 gap-8">
        {/* Image gallery */}
        <div className="space-y-3">
          <div className="aspect-square rounded-2xl overflow-hidden bg-gray-100 border border-gray-200">
            {images[activeImg] ? (
              <img src={images[activeImg]} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-6xl text-gray-300">📦</div>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImg(i)}
                  className={`shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition ${
                    activeImg === i ? 'border-blue-500' : 'border-transparent'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-4 py-2">
          {/* Store info */}
          <div className="flex items-center gap-1.5 text-sm text-gray-500">
            <MapPin className="h-4 w-4" />
            <span>{product.store_name ?? 'Unknown Store'}</span>
            {product.city && <span>· {product.city}</span>}
          </div>

          {/* Name */}
          <h1 className="text-2xl font-bold text-gray-900 leading-snug">{product.name}</h1>

          {/* Tags */}
          {product.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {product.tags.map((tag: string) => (
                <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Price */}
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

          {/* Stock badge */}
          {outOfStock ? (
            <span className="inline-block text-sm font-medium px-3 py-1 rounded-full bg-red-100 text-red-700">
              Out of Stock
            </span>
          ) : available <= 10 ? (
            <span className="inline-block text-sm font-medium px-3 py-1 rounded-full bg-amber-100 text-amber-700">
              Only {available} left
            </span>
          ) : (
            <span className="inline-block text-sm font-medium px-3 py-1 rounded-full bg-green-100 text-green-700">
              In Stock
            </span>
          )}

          {/* Description */}
          <p className="text-gray-600 text-sm leading-relaxed">{product.description}</p>

          {/* Qty selector */}
          <div className="flex items-center gap-3">
            <div className="flex items-center border border-gray-300 rounded-xl overflow-hidden">
              <button
                disabled={qty <= 1 || outOfStock}
                onClick={() => setQty(q => q - 1)}
                className="p-2.5 hover:bg-gray-100 disabled:opacity-40 transition"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="px-5 py-2 text-sm font-semibold min-w-[3rem] text-center">{qty}</span>
              <button
                disabled={qty >= available || outOfStock}
                onClick={() => setQty(q => q + 1)}
                className="p-2.5 hover:bg-gray-100 disabled:opacity-40 transition"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {/* Wishlist */}
            {user && (
              <button
                onClick={() => wishlistMutation.mutate()}
                disabled={wishlistMutation.isLoading}
                className={`p-2.5 rounded-xl border transition ${
                  wishlisted
                    ? 'border-red-300 bg-red-50 text-red-500'
                    : 'border-gray-300 text-gray-500 hover:border-red-300 hover:text-red-400'
                }`}
                aria-label="Wishlist"
              >
                <Heart className={`h-5 w-5 ${wishlisted ? 'fill-red-500' : ''}`} />
              </button>
            )}
          </div>

          {/* Reserve button — Phase 4 */}
          <div className="relative group w-full">
            <button
              disabled
              className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold text-sm opacity-50 cursor-not-allowed flex items-center justify-center gap-2"
            >
              <ShoppingBag className="h-4 w-4" />
              Reserve
            </button>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
              Coming in Phase 4
            </div>
          </div>
        </div>
      </div>

      {/* Reviews */}
      <div className="border-t border-gray-200 pt-8 space-y-4">
        <h2 className="text-lg font-bold text-gray-900">
          Customer Reviews
          {reviewsData?.total > 0 && (
            <span className="ml-2 text-sm font-normal text-gray-500">({reviewsData.total})</span>
          )}
        </h2>

        {reviewsData?.reviews?.length > 0 ? (
          <div className="space-y-4">
            {reviewsData.reviews.map((r: any) => (
              <div key={r.id} className="bg-white border border-gray-200 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm text-gray-800">{r.reviewer_name}</span>
                  <span className="text-xs text-gray-400">
                    {new Date(r.created_at).toLocaleDateString('en-IN')}
                  </span>
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
