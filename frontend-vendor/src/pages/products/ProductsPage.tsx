import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, X, Upload, AlertCircle } from 'lucide-react'
import api from '../../lib/axios'
import { toast } from 'sonner'

const categories = ["groceries", "dairy", "pharmacy", "electronics", "clothing", "other"]

export default function ProductsPage() {
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<any>(null)
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['my-products'],
    queryFn: async () => {
      const res = await api.get('/products/mine')
      return res.data
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-products'] })
      toast.success('Product removed successfully')
    },
    onError: () => toast.error('Failed to remove product')
  })

  const handleDelete = (product: any) => {
    if (confirm(`Remove ${product.name}? It will no longer be visible to users.`)) {
      deleteMutation.mutate(product.id)
    }
  }

  const openSheet = (product: any = null) => {
    setEditingProduct(product)
    setIsSheetOpen(true)
  }

  if (isLoading) {
    return <div className="space-y-6 animate-pulse">
      <div className="flex justify-between items-center">
        <div className="h-8 w-48 bg-gray-200 rounded" />
        <div className="h-10 w-32 bg-gray-200 rounded" />
      </div>
      <div className="bg-white rounded-xl border border-gray-100 h-96" />
    </div>
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-gray-500 text-sm">Manage your inventory and listings</p>
        </div>
        <button 
          onClick={() => openSheet()}
          className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus size={20} />
          <span>Add Product</span>
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center w-24">Image</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Price</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Stock</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Status</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data?.products?.length > 0 ? data.products.map((p: any) => (
              <tr key={p.id} className={`hover:bg-gray-50/50 transition-colors ${p.low_stock ? 'border-l-4 border-amber-400' : ''}`}>
                <td className="px-6 py-4 flex justify-center">
                  <img src={p.images[0] || '/placeholder.png'} className="w-12 h-12 rounded-lg object-cover border border-gray-100" />
                </td>
                <td className="px-6 py-4">
                  <p className="font-semibold text-gray-900">{p.name}</p>
                  <p className="text-xs text-gray-500 truncate max-w-xs">{p.description}</p>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    p.category === 'groceries' ? 'bg-green-50 text-green-700' :
                    p.category === 'dairy' ? 'bg-blue-50 text-blue-700' :
                    p.category === 'pharmacy' ? 'bg-red-50 text-red-700' :
                    p.category === 'electronics' ? 'bg-purple-50 text-purple-700' :
                    p.category === 'clothing' ? 'bg-pink-50 text-pink-700' :
                    'bg-gray-50 text-gray-700'
                  }`}>
                    {p.category}
                  </span>
                </td>
                <td className="px-6 py-4 text-right font-mono font-medium">₹{p.price.toLocaleString()}</td>
                <td className="px-6 py-4 text-center">
                  <div className="flex flex-col items-center">
                    <span className={`font-semibold ${p.low_stock ? 'text-amber-600' : 'text-gray-900'}`}>{p.stock}</span>
                    {p.low_stock && <AlertCircle size={14} className="text-amber-500 mt-0.5" />}
                  </div>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${p.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {p.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="flex justify-center space-x-2">
                    <button onClick={() => openSheet(p)} className="p-2 text-gray-400 hover:text-indigo-600 transition-colors">
                      <Pencil size={18} />
                    </button>
                    <button onClick={() => handleDelete(p)} className="p-2 text-gray-400 hover:text-red-600 transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={7} className="px-6 py-24 text-center text-gray-500">
                  No products yet. Add your first product!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isSheetOpen && (
        <ProductFormSheet 
          product={editingProduct} 
          onClose={() => setIsSheetOpen(false)} 
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['my-products'] })}
        />
      )}
    </div>
  )
}

function ProductFormSheet({ product, onClose, onSuccess }: { product?: any, onClose: () => void, onSuccess: () => void }) {
  const [images, setImages] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>(product?.images || [])
  const [loading, setLoading] = useState(false)

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const validFiles = files.filter(f => f.size <= 2 * 1024 * 1024)
    if (validFiles.length < files.length) toast.error("Some files exceed 2MB limit")
    
    setImages(prev => [...prev, ...validFiles].slice(0, 5))
    const newPreviews = validFiles.map(f => URL.createObjectURL(f))
    setPreviews(prev => [...prev, ...newPreviews].slice(0, 5))
  }

  const removeImage = (index: number) => {
    setPreviews(prev => prev.filter((_, i) => i !== index))
    setImages(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    
    // Process tags
    const tagsStr = formData.get('tags') as string
    const tags = tagsStr.split(',').map(t => t.trim()).filter(t => t !== "")
    formData.set('tags_json', JSON.stringify(tags))
    formData.delete('tags')

    // Append new images
    images.forEach(img => formData.append('images', img))

    try {
      if (product) {
        await api.put(`/products/${product.id}`, formData)
        toast.success('Product updated successfully')
      } else {
        await api.post('/products', formData)
        toast.success('Product added successfully')
      }
      onSuccess()
      onClose()
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to save product')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">{product ? 'Edit Product' : 'Add Product'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-auto p-6 space-y-6">
          <div className="space-y-1">
            <label className="text-sm font-semibold text-gray-700">Product Name</label>
            <input name="name" required defaultValue={product?.name} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-gray-700">Description</label>
            <textarea name="description" required defaultValue={product?.description} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-700">Category</label>
              <select name="category" required defaultValue={product?.category || categories[0]} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none appearance-none bg-white">
                {categories.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-700">Price (₹)</label>
              <input name="price" type="number" step="0.01" required defaultValue={product?.price} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-700">Stock Qty</label>
              <input name="stock" type="number" required defaultValue={product?.stock} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-700">Low Stock Alert Below</label>
              <input name="low_stock_threshold" type="number" defaultValue={product?.low_stock_threshold || 5} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-gray-700">Tags (comma separated)</label>
            <input name="tags" defaultValue={product?.tags?.join(', ')} placeholder="organic, fresh, imported" className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Images (Max 5)</label>
            <div className="grid grid-cols-5 gap-2">
              {previews.map((src, i) => (
                <div key={i} className="relative aspect-square">
                  <img src={src} className="w-full h-full object-cover rounded-lg border border-gray-200" />
                  <button type="button" onClick={() => removeImage(i)} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 shadow-sm">
                    <X size={12} />
                  </button>
                </div>
              ))}
              {previews.length < 5 && (
                <label className="aspect-square border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:border-indigo-300 hover:text-indigo-500 cursor-pointer transition-colors">
                  <Upload size={20} />
                  <span className="text-[10px] mt-1">Upload</span>
                  <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageChange} />
                </label>
              )}
            </div>
          </div>

          <div className="pt-6 border-t border-gray-100 flex space-x-3">
            <button type="button" onClick={onClose} className="flex-1 py-2 px-4 border border-gray-200 rounded-lg text-gray-600 font-semibold hover:bg-gray-50 transition-colors">Cancel</button>
            <button type="submit" disabled={loading} className="flex-[2] py-2 px-4 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50">
              {loading ? 'Saving...' : 'Save Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
