import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { MapPin, Package, Star } from 'lucide-react'
import { useGeolocation } from '../../hooks/useGeolocation'
import api from '../../lib/axios'

const STOCK_BADGE: Record<string, { label: string; cls: string }> = {
  in_stock:     { label: 'In Stock',    cls: 'bg-green-100 text-green-700' },
  low_stock:    { label: 'Low Stock',   cls: 'bg-amber-100 text-amber-700' },
  out_of_stock: { label: 'Out of Stock', cls: 'bg-red-100 text-red-700' },
}

export default function MapPage() {
  const navigate = useNavigate()
  const { lat, lng, loading, error } = useGeolocation()

  const { data: stores, isLoading } = useQuery({
    queryKey: ['stores-nearby', lat, lng],
    queryFn: () => api.get('/stores/nearby', { params: { lat, lng, radius_km: 5 } }).then(r => r.data),
    enabled: lat != null && lng != null,
  })

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900">Nearby Stores</h1>

      {/* Map placeholder */}
      <div className="h-64 bg-gray-100 rounded-2xl border border-gray-200 flex flex-col items-center justify-center gap-3 text-center">
        <MapPin className="h-12 w-12 text-gray-300" />
        <p className="font-semibold text-gray-500 text-lg">Interactive Map</p>
        <p className="text-sm text-gray-400 max-w-xs">
          Map view will be available once location services are configured
        </p>
      </div>

      {/* Location status */}
      {loading && (
        <p className="text-sm text-gray-500 flex items-center gap-2">
          <span className="inline-block w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          Getting your location...
        </p>
      )}
      {error && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
          {error} — Enable location to see nearby stores
        </div>
      )}

      {/* Store list */}
      {(!lat || !lng) && !loading && !error && (
        <p className="text-sm text-gray-400 text-center py-8">Enable location to see nearby stores</p>
      )}

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      )}

      {stores?.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-3">🏪</p>
          <p className="font-medium">No stores found within 5km</p>
        </div>
      )}

      {stores && stores.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-gray-500 font-medium">{stores.length} store{stores.length !== 1 ? 's' : ''} nearby</p>
          {stores.map((store: any) => {
            const badge = STOCK_BADGE[store.stock_status] ?? STOCK_BADGE.out_of_stock
            return (
              <div key={store.store_id} className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-gray-900">{store.store_name}</h3>
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3" />
                      {store.city}{store.state ? `, ${store.state}` : ''} · {store.distance_km} km away
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${badge.cls}`}>
                    {badge.label}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Package className="h-3.5 w-3.5" />
                    {store.matching_product_count} products
                  </span>
                  {store.average_rating > 0 && (
                    <span className="flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                      {Number(store.average_rating).toFixed(1)}
                    </span>
                  )}
                </div>

                <button
                  onClick={() => navigate(`/stores/${store.store_id}`)}
                  className="w-full py-2 text-sm font-medium border border-blue-300 text-blue-600 rounded-xl hover:bg-blue-50 transition"
                >
                  View Products
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
