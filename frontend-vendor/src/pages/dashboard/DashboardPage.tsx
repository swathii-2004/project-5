import { useQuery } from '@tanstack/react-query'
import { Package, CheckCircle, AlertTriangle, XCircle, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import api from '../../lib/axios'

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['my-products'],
    queryFn: async () => {
      const res = await api.get('/products/mine')
      return res.data
    }
  })

  const stats = {
    total: data?.total || 0,
    active: data?.products?.filter((p: any) => p.is_active).length || 0,
    lowStock: data?.products?.filter((p: any) => p.low_stock).length || 0,
    outOfStock: data?.products?.filter((p: any) => p.stock === 0).length || 0,
  }

  const lowStockProducts = data?.products?.filter((p: any) => p.low_stock).slice(0, 5) || []

  if (isLoading) {
    return <div className="animate-pulse space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[1,2,3,4].map(i => <div key={i} className="h-32 bg-gray-200 rounded-xl" />)}
      </div>
      <div className="h-64 bg-gray-200 rounded-xl" />
    </div>
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm">Overview of your store's performance</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Products</p>
              <h3 className="text-2xl font-bold mt-1">{stats.total}</h3>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><Package size={24} /></div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Active Listings</p>
              <h3 className="text-2xl font-bold mt-1">{stats.active}</h3>
            </div>
            <div className="p-3 bg-green-50 text-green-600 rounded-lg"><CheckCircle size={24} /></div>
          </div>
        </div>

        <div className={`bg-white p-6 rounded-xl border shadow-sm ${stats.lowStock > 0 ? 'border-amber-200 ring-1 ring-amber-50' : 'border-gray-100'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Low Stock Alerts</p>
              <h3 className="text-2xl font-bold mt-1 text-amber-600">{stats.lowStock}</h3>
            </div>
            <div className="p-3 bg-amber-50 text-amber-600 rounded-lg"><AlertTriangle size={24} /></div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Out of Stock</p>
              <h3 className="text-2xl font-bold mt-1 text-red-600">{stats.outOfStock}</h3>
            </div>
            <div className="p-3 bg-red-50 text-red-600 rounded-lg"><XCircle size={24} /></div>
          </div>
        </div>
      </div>

      {/* Needs Attention */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-900">Needs Attention</h3>
          {stats.lowStock > 0 && (
            <Link to="/inventory" className="text-indigo-600 text-sm font-medium hover:underline flex items-center">
              Update Stock <ChevronRight size={16} />
            </Link>
          )}
        </div>
        <div className="p-6">
          {lowStockProducts.length > 0 ? (
            <div className="space-y-4">
              {lowStockProducts.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between p-4 bg-amber-50/50 rounded-lg border border-amber-100">
                  <div className="flex items-center space-x-4">
                    <img src={p.images[0] || '/placeholder.png'} className="w-10 h-10 rounded object-cover" />
                    <div>
                      <p className="font-semibold text-gray-900">{p.name}</p>
                      <p className="text-xs text-amber-700">Only {p.available_qty} left (Threshold: {p.low_stock_threshold})</p>
                    </div>
                  </div>
                  <Link to="/inventory" className="px-3 py-1 bg-white border border-amber-200 text-amber-700 rounded text-sm font-medium hover:bg-amber-50">
                    Fix
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-green-600 font-medium">All products well stocked ✓</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
