import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { User, Phone, Mail, Camera, LogOut, Shield, ChevronRight, Bell, Heart, CreditCard } from 'lucide-react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import api from '../../lib/axios'
import { useAuthStore } from '../../store/authStore'
import { useNavigate } from 'react-router-dom'

export default function ProfilePage() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [editing, setEditing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  
  const [name, setName] = useState(user?.name || '')
  const [phone, setPhone] = useState(user?.phone || '')

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.put('/users/me', data),
    onSuccess: (res) => {
      toast.success('Profile updated!')
      useAuthStore.getState().setAuth(res.data, useAuthStore.getState().token!)
      setEditing(false)
      qc.invalidateQueries({ queryKey: ['user-profile'] })
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail ?? 'Update failed'),
  })

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string
      // Send the base64 string to the server
      updateMutation.mutate({ avatar_url: dataUrl })
    }
    reader.onerror = () => toast.error('Failed to read file')
    reader.readAsDataURL(file)
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto space-y-8 pb-20"
    >
      <div className="bg-white rounded-[3rem] shadow-xl overflow-hidden border border-gray-100">
        {/* Header / Avatar Section */}
        <div className="flex flex-col items-center p-10 bg-gradient-to-br from-blue-600 to-indigo-700 text-white relative">
          <div className="relative group">
            <div className="w-28 h-28 rounded-[2.5rem] bg-white/20 backdrop-blur-md flex items-center justify-center text-5xl font-black border-4 border-white/30 shadow-2xl overflow-hidden">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                user?.name?.[0]?.toUpperCase() ?? 'U'
              )}
            </div>
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={updateMutation.isLoading}
              className="absolute -bottom-2 -right-2 p-3 bg-white text-blue-600 rounded-2xl shadow-xl hover:scale-110 transition group-hover:rotate-12 disabled:opacity-50"
            >
              <Camera className="h-5 w-5" />
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleImageChange} 
            />
          </div>
          
          <div className="text-center mt-6 space-y-1">
            <h1 className="text-2xl font-black tracking-tight">{user?.name}</h1>
            <div className="flex items-center justify-center gap-3">
              <span className="text-[10px] font-black px-3 py-1 bg-white/20 rounded-full backdrop-blur-sm uppercase tracking-widest opacity-90">
                {user?.role || 'user'}
              </span>
              <span className="text-white/30">·</span>
              <p className="text-sm font-medium text-blue-100">{user?.email}</p>
            </div>
          </div>

          {/* Abstract background decorative circles */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-400/20 rounded-full -ml-12 -mb-12 blur-xl" />
        </div>

        {/* Info Content */}
        <div className="p-8 md:p-12 space-y-8">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-lg font-black text-gray-900 tracking-tight uppercase tracking-widest text-[10px] opacity-40">Personal Information</h2>
            {!editing ? (
              <button 
                onClick={() => {
                  setName(user?.name || '')
                  setPhone(user?.phone || '')
                  setEditing(true)
                }} 
                className="text-xs font-black text-blue-600 hover:bg-blue-50 px-4 py-1.5 rounded-full transition"
              >
                EDIT PROFILE
              </button>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => setEditing(false)} className="text-xs font-black text-gray-400 hover:text-gray-600 px-4 py-1.5 transition">CANCEL</button>
                <button 
                  onClick={() => updateMutation.mutate({ name, phone })}
                  disabled={updateMutation.isLoading}
                  className="text-xs font-black text-white bg-blue-600 hover:bg-blue-700 px-5 py-1.5 rounded-full shadow-lg shadow-blue-100 transition"
                >
                  {updateMutation.isLoading ? 'SAVING...' : 'SAVE'}
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="flex items-center gap-5 p-5 bg-gray-50 rounded-[2rem] border border-transparent hover:border-gray-100 transition">
              <div className="p-3.5 bg-white rounded-2xl shadow-sm">
                <User className="h-6 w-6 text-gray-400" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Full Name</p>
                {editing ? (
                  <input 
                    value={name} 
                    onChange={e => setName(e.target.value)}
                    className="w-full bg-transparent font-bold text-gray-900 focus:outline-none border-b-2 border-blue-100 focus:border-blue-500 py-1"
                  />
                ) : (
                  <p className="font-bold text-gray-900">{user?.name}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-5 p-5 bg-gray-50 rounded-[2rem] border border-transparent hover:border-gray-100 transition">
              <div className="p-3.5 bg-white rounded-2xl shadow-sm">
                <Mail className="h-6 w-6 text-gray-400" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Email Address</p>
                <p className="font-bold text-gray-900">{user?.email}</p>
              </div>
              <Shield className="h-5 w-5 text-green-500" />
            </div>

            <div className="flex items-center gap-5 p-5 bg-gray-50 rounded-[2rem] border border-transparent hover:border-gray-100 transition">
              <div className="p-3.5 bg-white rounded-2xl shadow-sm">
                <Phone className="h-6 w-6 text-gray-400" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Phone Number</p>
                {editing ? (
                  <input 
                    value={phone} 
                    onChange={e => setPhone(e.target.value)}
                    className="w-full bg-transparent font-bold text-gray-900 focus:outline-none border-b-2 border-blue-100 focus:border-blue-500 py-1"
                  />
                ) : (
                  <p className="font-bold text-gray-900">{user?.phone || 'Not provided'}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="flex items-center justify-between p-8 bg-red-50/50 rounded-[2.5rem] border border-red-100/50">
        <div className="space-y-1">
          <p className="text-sm font-black text-red-600 tracking-tight">Logout session?</p>
          <p className="text-xs text-red-400 font-medium">You will need to sign in again.</p>
        </div>
        <button 
          onClick={handleLogout}
          className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white font-black rounded-2xl text-xs hover:bg-red-700 transition shadow-lg shadow-red-100 active:scale-95"
        >
          <LogOut className="h-4 w-4" /> LOGOUT
        </button>
      </div>

      <p className="text-center text-[10px] font-black text-gray-300 uppercase tracking-[0.3em]">
        ProxiMart Security · v2.5.0
      </p>
    </motion.div>
  )
}
