import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '../../lib/api'

const CATEGORIES = [
  { value: '', label: 'All' },
  { value: 'groceries', label: 'Groceries' },
  { value: 'dairy', label: 'Dairy' },
  { value: 'pharmacy', label: 'Pharmacy' },
  { value: 'electronics', label: 'Electronics' },
  { value: 'clothing', label: 'Clothing' },
  { value: 'other', label: 'Other' },
]

function StockBadge({ stock, available }: { stock: number; available: number }) {
  if (available <= 0) {
    return (
      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">
        Out of Stock
      </span>
    )
  }
  if (available <= 10) {
    return (
      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
        Only {available} left
      </span>
    )
  }
  return (
    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
      In Stock
    </span>
  )
}

export default function SearchPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [category, setCategory] = useState('')
  const [rawSearch, setRawSearch] = useState(searchParams.get('q') ?? '')
  const [search, setSearch] = useState(searchParams.get('q') ?? '')
  const [page, setPage] = useState(1)

  // 400ms debounce
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(rawSearch)
      setPage(1)
    }, 400)
    return () => clearTimeout(t)
  }, [rawSearch])

  const { data, isLoading } = useQuery({
    queryKey: ['products-search', category, search, page],
    queryFn: () =>
      api
        .get('/products/', { params: { category, search, page, limit: 20 } })
        .then(r => r.data),
    keepPreviousData: true,
  })

  const products = data?.products ?? []
  const total = data?.total ?? 0
  const pages = data?.pages ?? 1
  const showing = products.length
  const from = (page - 1) * 20 + 1

  return (
    <div className="space-y-6">
      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {CATEGORIES.map(cat => (
          <button
            key={cat.value}
            onClick={() => { setCategory(cat.value); setPage(1) }}
            className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium border transition ${
              category === cat.value
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Search bar */}
      <div className="relative">
        <input
          type="text"
          value={rawSearch}
          onChange={e => setRawSearch(e.target.value)}
          placeholder="Search for products..."
          className="w-full pl-4 pr-10 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {rawSearch && (
          <button
            onClick={() => { setRawSearch(''); setSearch('') }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
          >
            ✕
          </button>
        )}
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden animate-pulse">
              <div className="aspect-square bg-gray-200" />
              <div className="p-3 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
                <div className="h-5 bg-gray-200 rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <p className="text-4xl mb-3">🔍</p>
          <p className="font-medium">No products found</p>
          <p className="text-sm mt-1">Try a different search or category</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500">
            Showing {from}–{from + showing - 1} of {total} products
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {products.map((product: any) => (
              <div
                key={product.id}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition group"
              >
                {/* Image */}
                <div className="aspect-square overflow-hidden bg-gray-100">
                  {product.images?.[0] ? (
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl text-gray-300">
                      📦
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="p-3 space-y-1.5">
                  <h3 className="font-medium text-sm text-gray-900 line-clamp-2 leading-tight">
                    {product.name}
                  </h3>
                  <p className="text-xs text-gray-500">{product.city ?? ''}</p>
                  <p className="text-base font-bold text-gray-900">
                    ₹{Number(product.price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                  <StockBadge stock={product.stock} available={product.available_qty} />
                  <button
                    disabled={product.available_qty <= 0}
                    onClick={() => navigate(`/products/${product.id}`)}
                    className="mt-2 w-full py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-center gap-3 pt-4">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition"
            >
              ← Prev
            </button>
            <span className="text-sm text-gray-600">
              Page {page} of {pages}
            </span>
            <button
              disabled={page >= pages}
              onClick={() => setPage(p => p + 1)}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition"
            >
              Next →
            </button>
          </div>
        </>
      )}
    </div>
  )
}
