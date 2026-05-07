import { useState } from 'react'
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

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto space-y-8 pb-20"
    >
      {/* Header / Avatar Section */}
      <div className="flex flex-col items-center pt-4">
        <div className="relative group">
          <div className="w-28 h-28 rounded-full bg-blue-600 flex items-center justify-center text-4xl font-bold text-white shadow-xl shadow-blue-100 border-4 border-white">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
            ) : (
              user?.name?.[0]?.toUpperCase() ?? 'U'
            )}
          </div>
          <button className="absolute bottom-1 right-1 p-2 bg-white rounded-full shadow-lg border border-gray-100 hover:bg-gray-50 transition">
            <Camera className="h-4 w-4 text-gray-600" />
          </button>
        </div>
        <h1 className="mt-4 text-2xl font-black text-gray-900 tracking-tight">{user?.name}</h1>
        <p className="text-sm font-bold text-blue-600 uppercase tracking-widest">{user?.role} Account</p>
      </div>

      {/* Info Card */}
      <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm space-y-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold text-gray-900">Personal Details</h2>
          {!editing ? (
            <button onClick={() => setEditing(true)} className="text-xs font-bold text-blue-600 hover:underline">EDIT</button>
          ) : (
            <div className="flex gap-3">
              <button onClick={() => setEditing(false)} className="text-xs font-bold text-gray-400">CANCEL</button>
              <button 
                onClick={() => updateMutation.mutate({ name, phone })}
                disabled={updateMutation.isLoading}
                className="text-xs font-bold text-blue-600"
              >
                SAVE
              </button>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl">
            <div className="p-2.5 bg-white rounded-xl shadow-sm">
              <User className="h-5 w-5 text-gray-400" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Full Name</p>
              {editing ? (
                <input 
                  value={name} 
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-transparent font-bold text-gray-900 focus:outline-none"
                />
              ) : (
                <p className="font-bold text-gray-900">{user?.name}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl">
            <div className="p-2.5 bg-white rounded-xl shadow-sm">
              <Mail className="h-5 w-5 text-gray-400" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Email Address</p>
              <p className="font-bold text-gray-900">{user?.email}</p>
            </div>
            <Shield className="h-4 w-4 text-green-500" />
          </div>

          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl">
            <div className="p-2.5 bg-white rounded-xl shadow-sm">
              <Phone className="h-5 w-5 text-gray-400" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Phone Number</p>
              {editing ? (
                <input 
                  value={phone} 
                  onChange={e => setPhone(e.target.value)}
                  className="w-full bg-transparent font-bold text-gray-900 focus:outline-none"
                />
              ) : (
                <p className="font-bold text-gray-900">{user?.phone || 'Not provided'}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 gap-3">
        {[
          { icon: Heart, label: 'My Wishlist', to: '/wishlist', count: '12' },
          { icon: Bell, label: 'Notifications', to: '/notifications', count: '5' },
          { icon: CreditCard, label: 'Payment Methods', to: '#', count: '0' },
        ].map((item, i) => (
          <button 
            key={i}
            onClick={() => item.to !== '#' && navigate(item.to)}
            className="flex items-center gap-4 p-5 bg-white border border-gray-100 rounded-3xl hover:bg-gray-50 transition group"
          >
            <div className="p-3 bg-gray-50 rounded-2xl group-hover:bg-blue-50 transition">
              <item.icon className="h-5 w-5 text-gray-500 group-hover:text-blue-600 transition" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-bold text-gray-900">{item.label}</p>
              <p className="text-xs text-gray-400 font-medium">{item.count} items found</p>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-blue-600 transition" />
          </button>
        ))}
      </div>

      {/* Logout */}
      <button 
        onClick={handleLogout}
        className="w-full py-5 bg-red-50 text-red-600 font-black rounded-3xl flex items-center justify-center gap-3 hover:bg-red-100 transition shadow-sm"
      >
        <LogOut className="h-5 w-5" />
        LOGOUT ACCOUNT
      </button>

      <p className="text-center text-[10px] font-bold text-gray-300 uppercase tracking-[0.2em]">
        ProxiMart v2.4.0 · Secure Session
      </p>
    </motion.div>
  )
}
