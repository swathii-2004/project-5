import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { User, Mail, Shield, Camera, Save, X, Edit2, LogOut } from 'lucide-react'
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

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.put('/users/me', data),
    onSuccess: (res) => {
      toast.success('Admin profile updated!')
      useAuthStore.getState().setAuth(res.data, useAuthStore.getState().token!)
      setEditing(false)
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail ?? 'Update failed'),
  })

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-20">
      <div className="bg-white rounded-[2.5rem] overflow-hidden shadow-sm border border-gray-100">
        <div className="h-32 bg-gradient-to-r from-gray-900 to-gray-800" />
        <div className="px-8 pb-8">
          <div className="relative -mt-16 mb-6 flex items-end justify-between">
            <div className="relative">
              <div className="w-32 h-32 rounded-[2rem] bg-white p-1 shadow-xl">
                <div className="w-full h-full rounded-[1.75rem] bg-gray-100 flex items-center justify-center text-4xl font-black text-gray-400 overflow-hidden">
                  {user?.avatar_url ? (
                    <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    user?.name?.[0]?.toUpperCase()
                  )}
                </div>
              </div>
              <button className="absolute bottom-2 right-2 p-2 bg-gray-900 text-white rounded-xl shadow-lg hover:bg-black transition">
                <Camera className="h-4 w-4" />
              </button>
            </div>
            {!editing ? (
              <button 
                onClick={() => setEditing(true)}
                className="mb-2 px-6 py-2.5 bg-gray-900 text-white font-bold text-xs rounded-xl hover:bg-black transition flex items-center gap-2"
              >
                <Edit2 className="h-3 w-3" /> EDIT PROFILE
              </button>
            ) : (
              <div className="mb-2 flex gap-2">
                <button 
                  onClick={() => setEditing(false)}
                  className="px-4 py-2.5 bg-gray-100 text-gray-500 font-bold text-xs rounded-xl hover:bg-gray-200 transition"
                >
                  CANCEL
                </button>
                <button 
                  onClick={() => updateMutation.mutate({ name })}
                  disabled={updateMutation.isLoading}
                  className="px-6 py-2.5 bg-indigo-600 text-white font-bold text-xs rounded-xl hover:bg-indigo-700 transition flex items-center gap-2"
                >
                  <Save className="h-3 w-3" /> {updateMutation.isLoading ? 'SAVING...' : 'SAVE CHANGES'}
                </button>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">{user?.name}</h1>
            <div className="flex items-center gap-2 text-indigo-600 font-bold text-[10px] uppercase tracking-widest">
              <Shield className="h-3 w-3" /> System Administrator
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-10">
            <div className="space-y-6">
              <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest">Account Security</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <Mail className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Login Email</p>
                    <p className="text-sm font-bold text-gray-900">{user?.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <Shield className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Two-Factor Auth</p>
                    <p className="text-sm font-bold text-green-600">Enabled</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest">Personal Info</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <User className="h-5 w-5 text-gray-400" />
                  <div className="flex-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Display Name</p>
                    {editing ? (
                      <input 
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className="w-full bg-transparent text-sm font-bold text-gray-900 focus:outline-none"
                      />
                    ) : (
                      <p className="text-sm font-bold text-gray-900">{user?.name}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-red-50 p-8 rounded-[2.5rem] border border-red-100 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-red-900">Sign Out</h3>
          <p className="text-xs text-red-700/70 mt-1 font-medium">Terminate your current administrative session securely.</p>
        </div>
        <button 
          onClick={handleLogout}
          className="px-8 py-3 bg-red-600 text-white font-black text-xs rounded-2xl shadow-lg shadow-red-200 hover:bg-red-700 transition flex items-center gap-2"
        >
          <LogOut className="h-4 w-4" /> LOGOUT
        </button>
      </div>
    </div>
  )
}
