import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { MapPin, Star, ShoppingBag } from 'lucide-react'
import api from '../../lib/axios'

export default function StorePage() {
  const { store_id } = useParams<{ store_id: string }>()
  const navigate = useNavigate()

  const { data: store, isLoading: sl } = useQuery({
    queryKey: ['store', store_id],
    queryFn: () => api.get(`/stores/${store_id}`).then(r => r.data),
  })

  const { data: pd, isLoading: pl } = useQuery({
    queryKey: ['store-products', store_id],
    queryFn: () => api.get(`/stores/${store_id}/products`).then(r => r.data),
  })

  if (sl) return <div className="max-w-3xl mx-auto space-y-4 animate-pulse"><div className="h-24 bg-gray-200 rounded-2xl" /></div>
  if (!store) return (
    <div className="text-center py-20 text-gray-400">
      <p className="text-4xl mb-3">🏪</p>
      <p className="font-medium">Store not found</p>
      <button onClick={() => navigate(-1)} className="mt-3 text-blue-600 text-sm hover:underline">← Go back</button>
    </div>
  )

  const products: any[] = pd?.products ?? []

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{store.store_name}</h1>
            <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
              <MapPin className="h-4 w-4" />{store.city}{store.state ? `, ${store.state}` : ''}
            </p>
          </div>
          {store.is_open_now != null && (
            <span className={`text-xs px-3 py-1 rounded-full font-semibold ${store.is_open_now ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {store.is_open_now ? 'Open Now' : 'Closed'}
            </span>
          )}
        </div>
        {store.average_rating > 0 && (
          <div className="flex items-center gap-2">
            {[1,2,3,4,5].map(s => <Star key={s} className={`h-4 w-4 ${s <= Math.round(store.average_rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />)}
            <span className="text-sm text-gray-600">{Number(store.average_rating).toFixed(1)}</span>
          </div>
        )}
      </div>

      <h2 className="font-bold text-gray-900">Products {pd?.total ? `(${pd.total})` : ''}</h2>
      {pl ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-48 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : products.length === 0 ? (
        <p className="text-gray-400 text-center py-8">No products available</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {products.map((p: any) => (
            <div key={p.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-md transition">
              <div className="h-36 bg-gray-100">
                {p.images?.[0]
                  ? <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-3xl text-gray-300">📦</div>}
              </div>
              <div className="p-3 space-y-2">
                <p className="font-semibold text-sm text-gray-900 truncate">{p.name}</p>
                <p className="font-bold text-gray-900">₹{Number(p.discounted_price ?? p.price).toLocaleString('en-IN')}</p>
                <button
                  disabled={p.available_qty <= 0}
                  onClick={() => navigate(`/products/${p.id}`)}
                  className="w-full py-1.5 text-xs font-medium bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-40 transition flex items-center justify-center gap-1"
                >
                  <ShoppingBag className="h-3 w-3" />{p.available_qty <= 0 ? 'Out of Stock' : 'Reserve'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
