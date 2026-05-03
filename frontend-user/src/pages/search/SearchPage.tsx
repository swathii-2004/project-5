import { useState, useEffect, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { MapPin, SlidersHorizontal, Star, ShoppingBag, WifiOff } from 'lucide-react'
import { useGeolocation } from '../../hooks/useGeolocation'
import OfflineBanner from '../../components/shared/OfflineBanner'
import api from '../../lib/axios'

const CATEGORIES = ['all', 'groceries', 'dairy', 'bakery', 'meat', 'vegetables', 'fruits', 'beverages', 'snacks']
const RADIUS_OPTIONS = [1, 2, 5, 10]
const SORT_OPTIONS = [
  { value: 'distance', label: 'Nearest' },
  { value: 'price', label: 'Lowest Price' },
  { value: 'rating', label: 'Highest Rated' },
]

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

function ProductCard({ product, isNearest, isBestDeal, isOnline }: { product: any; isNearest: boolean; isBestDeal: boolean; isOnline: boolean }) {
  const navigate = useNavigate()
  const price = product.discounted_price ?? product.price

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-md transition group">
      <div className="relative h-40 bg-gray-100">
        {product.images?.[0]
          ? <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
          : <div className="w-full h-full flex items-center justify-center text-4xl text-gray-300">📦</div>
        }
        <div className="absolute top-2 left-2 flex gap-1.5">
          {isNearest && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-green-500 text-white font-semibold flex items-center gap-1">
              <MapPin className="h-2.5 w-2.5" />Nearest
            </span>
          )}
          {isBestDeal && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-400 text-white font-semibold">⭐ Best Deal</span>
          )}
        </div>
        {product.distance_km != null && (
          <span className="absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full bg-white/90 text-green-700 font-medium flex items-center gap-1">
            <MapPin className="h-2.5 w-2.5" />{product.distance_km} km
          </span>
        )}
      </div>

      <div className="p-3 space-y-1.5">
        <p className="font-semibold text-sm text-gray-900 truncate">{product.name}</p>
        <p className="text-xs text-gray-500 truncate">{product.store_name}{product.city ? ` · ${product.city}` : ''}</p>

        <div className="flex items-center gap-1">
          <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
          <span className="text-xs text-gray-600">{product.average_rating?.toFixed(1) ?? '0.0'}</span>
        </div>

        <div className="flex items-center justify-between pt-1">
          <div>
            <span className="font-bold text-gray-900">
              ₹{Number(price).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
            </span>
            {product.discounted_price && (
              <span className="text-xs text-gray-400 line-through ml-1">₹{Number(product.price).toLocaleString('en-IN')}</span>
            )}
          </div>
          <button
            disabled={!isOnline || product.available_qty <= 0}
            onClick={() => navigate(`/products/${product.id}`)}
            className="flex items-center gap-1 text-xs px-3 py-1.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            {!isOnline ? <WifiOff className="h-3 w-3" /> : <ShoppingBag className="h-3 w-3" />}
            {product.available_qty <= 0 ? 'Out of Stock' : 'Reserve'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('q') ?? '')
  const [category, setCategory] = useState('')
  const [radius, setRadius] = useState(5)
  const [sort, setSort] = useState<'distance' | 'price' | 'rating'>('distance')
  const [availableNow, setAvailableNow] = useState(false)
  const [page, setPage] = useState(1)
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  const debouncedSearch = useDebounce(search, 300)
  const { lat, lng, loading: geoLoading, error: geoError } = useGeolocation()

  useEffect(() => {
    const on = () => setIsOnline(true)
    const off = () => setIsOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  useEffect(() => { setPage(1) }, [debouncedSearch, category, radius, sort, availableNow, lat, lng])

  const params: Record<string, string | number | boolean> = {
    sort, page, limit: 20, radius_km: radius,
    ...(debouncedSearch ? { q: debouncedSearch } : {}),
    ...(category && category !== 'all' ? { category } : {}),
    ...(availableNow ? { available_now: true } : {}),
    ...(lat != null ? { lat } : {}),
    ...(lng != null ? { lng } : {}),
  }

  const { data, isLoading } = useQuery({
    queryKey: ['products', 'search', debouncedSearch, category, radius, sort, availableNow, page, lat, lng],
    queryFn: () => api.get('/products/search', { params }).then(r => r.data),
    keepPreviousData: true,
  })

  const products: any[] = data?.products ?? []

  // Badges
  const nearestId = sort === 'distance' && products.find(p => p.distance_km != null)?.id
  const lowestPrice = Math.min(...products.map(p => p.discounted_price ?? p.price))

  return (
    <div className="space-y-4">
      <OfflineBanner />

      {/* Geo status bar */}
      <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-xl ${
        geoLoading ? 'bg-gray-100 text-gray-500'
        : geoError ? 'bg-amber-50 text-amber-700'
        : 'bg-green-50 text-green-700'
      }`}>
        <MapPin className="h-3.5 w-3.5 shrink-0" />
        {geoLoading ? '📍 Getting your location...'
         : geoError ? `📍 Location unavailable — showing all results`
         : `📍 Showing results within ${radius}km`}
      </div>

      {/* Search bar */}
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search products..."
        className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
      />

      {/* Controls row */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Radius chips */}
        <div className="flex gap-1">
          {RADIUS_OPTIONS.map(r => (
            <button key={r} onClick={() => setRadius(r)}
              className={`text-xs px-3 py-1.5 rounded-full border font-medium transition ${radius === r ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:border-blue-400'}`}
            >{r}km</button>
          ))}
        </div>

        {/* Sort */}
        <select value={sort} onChange={e => setSort(e.target.value as any)}
          className="text-xs border border-gray-300 rounded-xl px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
        >
          {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        {/* Available Now toggle */}
        <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer select-none">
          <div className="relative">
            <input type="checkbox" className="sr-only" checked={availableNow} onChange={e => setAvailableNow(e.target.checked)} />
            <div className={`w-9 h-5 rounded-full transition ${availableNow ? 'bg-blue-600' : 'bg-gray-300'}`} />
            <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${availableNow ? 'translate-x-4' : ''}`} />
          </div>
          Available Now
        </label>
      </div>

      {/* Category tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setCategory(c === 'all' ? '' : c)}
            className={`shrink-0 text-xs px-3 py-1.5 rounded-full border font-medium capitalize transition ${
              (c === 'all' ? !category : category === c)
                ? 'bg-blue-600 text-white border-blue-600'
                : 'border-gray-200 text-gray-600 hover:border-blue-400 bg-white'
            }`}
          >{c}</button>
        ))}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {[...Array(8)].map((_, i) => <div key={i} className="bg-gray-100 rounded-2xl h-56 animate-pulse" />)}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-5xl mb-3">🔍</p>
          <p className="font-medium">No products found</p>
          <p className="text-sm mt-1">Try expanding the radius or clearing filters</p>
        </div>
      ) : (
        <>
          <p className="text-xs text-gray-500">{data?.total ?? 0} results</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {products.map(p => (
              <ProductCard
                key={p.id}
                product={p}
                isNearest={p.id === nearestId}
                isBestDeal={(p.discounted_price ?? p.price) === lowestPrice && products.length > 1}
                isOnline={isOnline}
              />
            ))}
          </div>

          {/* Pagination */}
          {data?.pages > 1 && (
            <div className="flex gap-2 justify-center pt-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                className="px-4 py-2 text-sm border border-gray-300 rounded-xl disabled:opacity-40 hover:bg-gray-50 transition">
                ← Prev
              </button>
              <span className="px-4 py-2 text-sm text-gray-500">Page {page} of {data.pages}</span>
              <button disabled={page >= data.pages} onClick={() => setPage(p => p + 1)}
                className="px-4 py-2 text-sm border border-gray-300 rounded-xl disabled:opacity-40 hover:bg-gray-50 transition">
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
