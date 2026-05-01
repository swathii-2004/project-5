import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Info, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import api from '../../lib/axios'
import { toast } from 'sonner'

export default function InventoryPage() {
  const queryClient = useQueryClient()
  const [updateQtys, setUpdateQtys] = useState<Record<string, number>>({})

  const { data, isLoading } = useQuery({
    queryKey: ['my-products-inventory'],
    queryFn: async () => {
      const res = await api.get('/products/mine?limit=100')
      return res.data
    }
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, quantity }: { id: string, quantity: number }) => {
      return api.put(`/products/${id}/stock`, { quantity })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-products-inventory'] })
      queryClient.invalidateQueries({ queryKey: ['my-products'] })
      toast.success('Stock updated successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to update stock')
    }
  })

  const handleUpdate = (id: string) => {
    const qty = updateQtys[id] || 0
    if (qty === 0) return
    updateMutation.mutate({ id, quantity: qty })
    setUpdateQtys(prev => ({ ...prev, [id]: 0 }))
  }

  const lowStockCount = data?.products?.filter((p: any) => p.low_stock).length || 0

  if (isLoading) {
    return <div className="space-y-6 animate-pulse">
      <div className="h-20 bg-gray-200 rounded-xl" />
      <div className="bg-white rounded-xl border border-gray-100 h-96" />
    </div>
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
        <p className="text-gray-500 text-sm">Quickly update stock levels and monitor low inventory</p>
      </div>

      {lowStockCount > 0 && (
        <div className="flex items-center space-x-3 p-4 bg-amber-50 border border-amber-100 rounded-xl text-amber-800">
          <AlertTriangle size={20} className="text-amber-600" />
          <p className="font-medium">{lowStockCount} products are running low on stock. Please restock soon.</p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Product Name</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Current Stock</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Reserved</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Available</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Threshold</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-64">Update Stock</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data?.products?.map((p: any) => (
              <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4 font-medium text-gray-900">{p.name}</td>
                <td className="px-6 py-4 text-center">{p.stock}</td>
                <td className="px-6 py-4 text-center text-gray-500">{p.reserved_qty}</td>
                <td className={`px-6 py-4 text-center font-bold ${p.low_stock ? 'text-amber-600' : 'text-green-600'}`}>
                  {p.available_qty}
                </td>
                <td className="px-6 py-4 text-center text-gray-500">{p.low_stock_threshold}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-2">
                    <input 
                      type="number" 
                      value={updateQtys[p.id] || 0}
                      onChange={(e) => setUpdateQtys(prev => ({ ...prev, [p.id]: parseInt(e.target.value) || 0 }))}
                      className="w-20 px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 outline-none"
                    />
                    <button 
                      onClick={() => handleUpdate(p.id)}
                      disabled={!updateQtys[p.id]}
                      className="px-3 py-1 bg-indigo-600 text-white rounded text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                    >
                      Update
                    </button>
                    {updateQtys[p.id] !== 0 && (
                      <span className={`text-xs ${updateQtys[p.id] > 0 ? 'text-green-600' : 'text-red-600'} font-bold flex items-center`}>
                        {updateQtys[p.id] > 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                        {Math.abs(updateQtys[p.id])}
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
