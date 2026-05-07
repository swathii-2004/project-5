import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Store, 
  MapPin, 
  Phone, 
  Mail, 
  Clock, 
  Camera, 
  Save, 
  X,
  Edit2,
  Globe,
  Tag
} from 'lucide-react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import api from '../../lib/axios'
import { useAuthStore } from '../../store/authStore'

export default function ProfilePage() {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const [editing, setEditing] = useState(false)

  const { data: profile, isLoading } = useQuery({
    queryKey: ['vendor-profile'],
    queryFn: () => api.get('/vendors/me/profile').then(r => r.data),
  })

  const [formData, setFormData] = useState({
    store_name: '',
    description: '',
    address: '',
    city: '',
    phone: '',
    category: ''
  })

  const startEdit = () => {
    setFormData({
      store_name: profile?.store_name || '',
      description: profile?.description || '',
      address: profile?.address || '',
      city: profile?.city || '',
      phone: profile?.phone || '',
      category: profile?.category || ''
    })
    setEditing(true)
  }

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.put('/vendors/me/profile', data),
    onSuccess: () => {
      toast.success('Profile updated successfully!')
      setEditing(false)
      qc.invalidateQueries({ queryKey: ['vendor-profile'] })
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail ?? 'Update failed'),
  })

  if (isLoading) return <div className="p-8 text-center animate-pulse">Loading profile...</div>

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      {/* Header Banner */}
      <div className="relative h-48 bg-indigo-600 rounded-[2.5rem] overflow-hidden shadow-lg">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/50 to-purple-600/50 backdrop-blur-sm" />
        <div className="absolute bottom-0 left-0 right-0 p-8 flex items-end gap-6 translate-y-12">
          <div className="relative group">
            <div className="w-32 h-32 rounded-3xl bg-white flex items-center justify-center text-4xl font-black text-indigo-600 shadow-2xl border-4 border-white">
              {profile?.logo_url ? (
                <img src={profile.logo_url} alt="" className="w-full h-full rounded-2xl object-cover" />
              ) : (
                profile?.store_name?.[0] ?? 'S'
              )}
            </div>
            <button className="absolute -bottom-2 -right-2 p-2.5 bg-indigo-600 text-white rounded-xl shadow-lg hover:bg-indigo-700 transition">
              <Camera className="h-4 w-4" />
            </button>
          </div>
          <div className="mb-14 hidden sm:block">
            <h1 className="text-3xl font-black text-white tracking-tight">{profile?.store_name}</h1>
            <div className="flex items-center gap-2 text-indigo-100 text-sm mt-1 font-medium">
              <Tag className="h-4 w-4" /> {profile?.category || 'General Store'}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-12">
        {/* Left Column - Public Info */}
        <div className="space-y-6">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-bold text-gray-900">Store Profile</h2>
              {!editing && (
                <button onClick={startEdit} className="p-2 bg-gray-50 text-indigo-600 rounded-xl hover:bg-indigo-50 transition">
                  <Edit2 className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="space-y-5">
              <div className="flex gap-4">
                <div className="p-2 bg-gray-50 rounded-xl h-fit"><MapPin className="h-4 w-4 text-gray-400" /></div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Location</p>
                  <p className="text-sm font-bold text-gray-800 mt-0.5">{profile?.address}, {profile?.city}</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="p-2 bg-gray-50 rounded-xl h-fit"><Phone className="h-4 w-4 text-gray-400" /></div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Support Line</p>
                  <p className="text-sm font-bold text-gray-800 mt-0.5">{profile?.phone}</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="p-2 bg-gray-50 rounded-xl h-fit"><Mail className="h-4 w-4 text-gray-400" /></div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Business Email</p>
                  <p className="text-sm font-bold text-gray-800 mt-0.5">{user?.email}</p>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-indigo-600 p-8 rounded-[2rem] text-white shadow-xl shadow-indigo-100 relative overflow-hidden"
          >
            <div className="relative z-10">
              <Globe className="h-8 w-8 mb-4 opacity-50" />
              <h3 className="font-bold text-lg">Public Listing</h3>
              <p className="text-indigo-100 text-xs mt-2 leading-relaxed">
                Your store is visible to customers within 10km. Keep your inventory updated to rank higher in searches.
              </p>
            </div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl" />
          </motion.div>
        </div>

        {/* Right Column - Editor */}
        <div className="lg:col-span-2">
          {editing ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white p-8 rounded-[2.5rem] border-2 border-indigo-100 shadow-xl space-y-6"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-gray-900">Edit Business Info</h2>
                <div className="flex gap-2">
                  <button onClick={() => setEditing(false)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-xl transition">
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Store Name</label>
                  <input 
                    value={formData.store_name}
                    onChange={e => setFormData({...formData, store_name: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Category</label>
                  <select 
                    value={formData.category}
                    onChange={e => setFormData({...formData, category: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Electronics">Electronics</option>
                    <option value="Grocery">Grocery</option>
                    <option value="Pharmacy">Pharmacy</option>
                    <option value="Fashion">Fashion</option>
                    <option value="Others">Others</option>
                  </select>
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Description</label>
                  <textarea 
                    rows={3}
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Address</label>
                  <input 
                    value={formData.address}
                    onChange={e => setFormData({...formData, address: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">City</label>
                  <input 
                    value={formData.city}
                    onChange={e => setFormData({...formData, city: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <button 
                onClick={() => updateMutation.mutate(formData)}
                disabled={updateMutation.isLoading}
                className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-lg shadow-indigo-200 flex items-center justify-center gap-3 hover:bg-indigo-700 transition"
              >
                <Save className="h-5 w-5" />
                {updateMutation.isLoading ? 'UPDATING...' : 'SAVE CHANGES'}
              </button>
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-8"
            >
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">About the Store</h2>
                <p className="text-gray-600 leading-relaxed italic">
                  "{profile?.description || 'No description provided. Add one to attract more customers!'}"
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-6 bg-green-50 rounded-3xl border border-green-100">
                  <p className="text-[10px] font-bold text-green-600 uppercase tracking-widest">Completed Deals</p>
                  <p className="text-2xl font-black text-green-700 mt-1">{profile?.total_completed_reservations || 0}</p>
                </div>
                <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100">
                  <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Avg. Rating</p>
                  <p className="text-2xl font-black text-blue-700 mt-1">{profile?.average_rating?.toFixed(1) || '0.0'}</p>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-50 flex items-center gap-3">
                <Clock className="h-5 w-5 text-gray-400" />
                <p className="text-xs font-bold text-gray-400">Member since {new Date(profile?.created_at).toLocaleDateString()}</p>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}
