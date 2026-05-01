import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Heart, MapPin, X } from 'lucide-react'
import { toast } from 'sonner'
import api from '../../lib/api'

export default function WishlistPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['wishlist'],
    queryFn: () => api.get('/wishlist/').then(r => r.data),
  })

  const removeMutation = useMutation({
    mutationFn: (productId: string) => api.delete(`/wishlist/${productId}`),
    onSuccess: () => {
      toast.success('Removed from wishlist')
      qc.invalidateQueries({ queryKey: ['wishlist'] })
    },
    onError: () => toast.error('Failed to remove'),
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white border border-gray-200 rounded-xl p-4 animate-pulse h-24" />
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-28 text-center space-y-4">
        <Heart className="h-16 w-16 text-gray-200" />
        <h2 className="text-xl font-semibold text-gray-800">Your wishlist is empty</h2>
        <p className="text-gray-500 text-sm">Save items you love and find them here later.</p>
        <button
          onClick={() => navigate('/search')}
          className="mt-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition"
        >
          Browse Products
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-gray-900">My Wishlist</h1>
      <p className="text-sm text-gray-500">{items.length} item{items.length !== 1 ? 's' : ''}</p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item: any) => {
          const product = item.product ?? {}
          const currentPrice = product.price ?? 0
          const priceAtAdd = item.price_at_add ?? currentPrice
          const dropped = item.price_drop
          const backInStock = item.back_in_stock

          return (
            <div
              key={item.wishlist_id}
              className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition relative"
            >
              {/* Remove button */}
              <button
                onClick={() => removeMutation.mutate(product.id)}
                disabled={removeMutation.isLoading}
                className="absolute top-2 right-2 z-10 p-1 bg-white/80 rounded-full hover:bg-red-50 hover:text-red-500 transition text-gray-400"
                aria-label="Remove"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Banners */}
              {dropped && (
                <div className="bg-green-500 text-white text-xs font-semibold px-3 py-1 text-center">
                  🎉 Price dropped!
                </div>
              )}
              {backInStock && !dropped && (
                <div className="bg-blue-500 text-white text-xs font-semibold px-3 py-1 text-center">
                  ✅ Back in stock!
                </div>
              )}

              <div className="flex gap-3 p-4">
                {/* Image */}
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                  {product.images?.[0] ? (
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl text-gray-300">
                      📦
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 space-y-1">
                  <h3 className="font-semibold text-sm text-gray-900 truncate">{product.name}</h3>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <MapPin className="h-3 w-3" />
                    <span>{product.city ?? '—'}</span>
                  </div>

                  {/* Price */}
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-bold text-gray-900">
                      ₹{Number(currentPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                    {dropped && (
                      <span className="text-xs text-gray-400 line-through">
                        ₹{Number(priceAtAdd).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => navigate(`/products/${product.id}`)}
                    className="mt-1 text-xs px-3 py-1 bg-blue-50 text-blue-600 font-medium rounded-lg hover:bg-blue-100 transition"
                  >
                    View Product
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
