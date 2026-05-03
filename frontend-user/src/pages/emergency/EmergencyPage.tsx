import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { MapPin, AlertTriangle, ShoppingBag, Navigation } from 'lucide-react'
import { useGeolocation } from '../../hooks/useGeolocation'
import api from '../../lib/axios'

const RADIUS_OPTS = [5, 10, 25]

function distanceColor(km: number) {
  if (km < 2) return 'text-green-600'
  if (km < 5) return 'text-amber-600'
  return 'text-red-500'
}

export default function EmergencyPage() {
  const navigate = useNavigate()
  const { lat, lng, error: geoError } = useGeolocation()
  const [query, setQuery] = useState('')
  const [radius, setRadius] = useState(10)
  const [results, setResults] = useState<any[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const searchMut = useMutation({
    mutationFn: () =>
      api.get('/products/emergency', {
        params: { q: query, lat, lng, radius_km: radius }
      }).then(r => r.data),
    onSuccess: (data) => setResults(data.products ?? []),
  })

  const canSearch = query.trim().length >= 2 && lat != null && lng != null

  return (
    <div className="max-w-xl mx-auto space-y-5">
      {/* Header */}
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-bold text-red-600 flex items-center justify-center gap-2">
          <AlertTriangle className="h-6 w-6" /> Emergency Mode
        </h1>
        <p className="text-sm text-gray-500">Finding essential items near you as fast as possible</p>
      </div>

      {/* Geo warning */}
      {geoError && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700 flex items-center gap-2">
          <MapPin className="h-4 w-4 shrink-0" />
          Enable location for emergency search
        </div>
      )}

      {/* Search */}
      <div className="space-y-3">
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && canSearch && searchMut.mutate()}
          placeholder="What do you urgently need? (e.g. medicine, baby formula)"
          className="w-full border-2 border-red-300 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-red-500 bg-white"
        />

        <div className="flex gap-2">
          {RADIUS_OPTS.map(r => (
            <button key={r} onClick={() => setRadius(r)}
              className={`flex-1 py-2 text-xs font-semibold rounded-xl border transition ${radius === r ? 'bg-red-600 text-white border-red-600' : 'border-gray-300 text-gray-600 hover:border-red-400'}`}
            >{r}km</button>
          ))}
        </div>

        <button
          disabled={!canSearch || searchMut.isLoading}
          onClick={() => searchMut.mutate()}
          className="w-full py-3 bg-red-600 text-white font-bold rounded-2xl hover:bg-red-700 disabled:opacity-40 transition flex items-center justify-center gap-2"
        >
          {searchMut.isLoading
            ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Searching...</>
            : '🔍 Search Now'
          }
        </button>
      </div>

      {/* Results */}
      {searchMut.isSuccess && results.length === 0 && (
        <div className="text-center py-10 text-gray-400">
          <p className="text-3xl mb-2">😕</p>
          <p className="font-medium">No results found nearby</p>
          <p className="text-sm mt-1">Try expanding the radius</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500">{results.length} result{results.length !== 1 ? 's' : ''} found</p>
          {results.map((p: any) => (
            <div key={p.id} className="bg-white border border-gray-200 rounded-2xl p-3 flex gap-3 items-center">
              <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                {p.images?.[0]
                  ? <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-xl">📦</div>}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-gray-900 truncate">{p.name}</p>
                <p className="text-xs text-gray-500 truncate">{p.store_name}{p.city ? ` · ${p.city}` : ''}</p>
                <p className={`text-sm font-bold mt-0.5 ${distanceColor(p.distance_km)}`}>{p.distance_km} km away</p>
              </div>

              <div className="flex flex-col gap-1.5 shrink-0">
                <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-center">
                  {p.available_qty} left
                </span>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${p.store_name} ${p.city}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs px-2 py-1 bg-blue-600 text-white rounded-lg flex items-center gap-1 hover:bg-blue-700 transition"
                >
                  <Navigation className="h-3 w-3" />Go
                </a>
                <button
                  onClick={() => navigate(`/products/${p.id}`)}
                  className="text-xs px-2 py-1 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition flex items-center gap-1"
                >
                  <ShoppingBag className="h-3 w-3" />Reserve
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <button onClick={() => navigate('/search')} className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 underline">
        Exit Emergency Mode
      </button>
    </div>
  )
}
