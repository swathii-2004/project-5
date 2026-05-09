import { useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search, Heart, MapPin, Clock, ShoppingBag, ChevronRight, Zap, Star } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useLocationStore } from '../../store/locationStore'
import api from '../../lib/axios'

export default function UserDashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { latitude, longitude } = useLocationStore()

  const { data: dashboard, isLoading: dashLoading } = useQuery({
    queryKey: ['user-dashboard'],
    queryFn: () => api.get('/users/me/dashboard').then(r => r.data)
  })

  const { data: recommended, isLoading: recLoading } = useQuery({
    queryKey: ['recommended', latitude, longitude],
    queryFn: () => api.get('/products/search', { params: { limit: 10 } }).then(r => r.data?.products || []),
  })

  if (dashLoading) {
    return (
      <div className="max-w-6xl mx-auto space-y-8 animate-pulse p-6">
        <div className="h-48 bg-gray-100 rounded-[3rem]" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-32 bg-gray-100 rounded-3xl" />
          <div className="h-32 bg-gray-100 rounded-3xl" />
          <div className="h-32 bg-gray-100 rounded-3xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 h-96 bg-gray-100 rounded-[2.5rem]" />
          <div className="h-96 bg-gray-100 rounded-[2.5rem]" />
        </div>
      </div>
    )
  }

  const stats = dashboard?.stats || { total_reservations: 0, completed_reservations: 0, active_wishlist_items: 0 }
  const activeRes = dashboard?.active_reservations || []
  const nearbyStores = dashboard?.nearby_stores_preview || []
  const alerts = dashboard?.wishlist_alerts || []

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-24 px-4">
      {/* Hero Header with Glassmorphism Search */}
      <div className="relative overflow-hidden rounded-[3rem] bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 p-8 md:p-12 text-white shadow-2xl shadow-blue-200">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-10">
          <div className="space-y-4 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest">
              <Zap className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              ProxiMart Premium
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-[1.1]">
              Welcome back, <span className="text-blue-100">{user?.name?.split(' ')[0] || 'Friend'}</span>
            </h1>
            <p className="text-blue-50 font-medium text-lg opacity-90">
              Ready to discover great deals and save the planet?
            </p>
            
            {/* Search Bar */}
            <div className="relative group max-w-md pt-4">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-blue-300 group-focus-within:text-white transition-colors" />
              <input 
                type="text"
                placeholder="Search products or stores..."
                onClick={() => navigate('/search')}
                className="w-full bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-blue-200 focus:outline-none focus:ring-2 focus:ring-white/30 transition-all cursor-pointer"
                readOnly
              />
            </div>
          </div>
          
          <div className="flex gap-4 md:gap-10">
            <div className="text-center">
              <p className="text-[10px] font-black text-blue-200 uppercase tracking-[0.2em] mb-2">Bookings</p>
              <p className="text-4xl font-black">{stats.total_reservations}</p>
            </div>
            <div className="w-px h-16 bg-white/10" />
            <div className="text-center">
              <p className="text-[10px] font-black text-blue-200 uppercase tracking-[0.2em] mb-2">Saved</p>
              <p className="text-4xl font-black text-blue-100">{stats.completed_reservations}</p>
            </div>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -mr-48 -mt-48" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl -ml-32 -mb-32" />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        
        {/* Left Column: Reservations & Alerts */}
        <div className="lg:col-span-2 space-y-12">
          
          {/* Active Reservations */}
          <section className="space-y-6">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-3">
                <div className="w-2 h-8 bg-blue-600 rounded-full" />
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">Active Reservations</h2>
              </div>
              <Link to="/reservations" className="text-sm font-bold text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-xl transition flex items-center gap-1">
                All <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {activeRes.length > 0 ? (
                activeRes.map((res: any) => (
                  <div 
                    key={res.id} 
                    className="group relative bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl hover:border-blue-100 transition-all duration-500 overflow-hidden"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gray-50 shrink-0 border border-gray-100">
                        <img 
                          src={res.items[0]?.image_url || 'https://placehold.co/100'} 
                          alt="" 
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                        />
                      </div>
                      <div className="flex-1 min-w-0 space-y-2">
                        <p className="font-bold text-gray-900 leading-tight truncate">{res.items[0]?.name}</p>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-[9px] px-2 py-0.5 rounded-lg font-black uppercase tracking-wider ${
                            res.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {res.status}
                          </span>
                          {res.countdown_seconds > 0 && (
                            <span className="flex items-center gap-1 text-[9px] text-gray-400 font-bold uppercase tracking-widest">
                              <Clock className="h-3 w-3" />
                              {Math.floor(res.countdown_seconds / 60)}m
                            </span>
                          )}
                        </div>
                        <button 
                          onClick={() => navigate('/reservations')}
                          className="w-full mt-2 py-2 bg-gray-50 group-hover:bg-blue-600 group-hover:text-white text-gray-600 text-xs font-bold rounded-xl transition-all"
                        >
                          Details
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full bg-gray-50/50 rounded-[2.5rem] p-12 text-center border-2 border-dashed border-gray-200">
                  <div className="w-20 h-20 bg-white rounded-3xl shadow-sm flex items-center justify-center mx-auto mb-6 transform rotate-6">
                    <ShoppingBag className="h-10 w-10 text-gray-200" />
                  </div>
                  <h3 className="text-gray-900 font-black text-lg mb-2">No active bookings</h3>
                  <p className="text-gray-500 text-sm max-w-xs mx-auto mb-6 font-medium">Your future reservations will appear here. Start exploring!</p>
                  <button 
                    onClick={() => navigate('/search')}
                    className="px-8 py-3 bg-blue-600 text-white font-black rounded-2xl text-xs hover:bg-blue-700 transition shadow-lg shadow-blue-200"
                  >
                    FIND PRODUCTS
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* Smart Alerts */}
          {alerts.length > 0 && (
            <section className="space-y-6">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-8 bg-red-500 rounded-full" />
                  <h2 className="text-2xl font-black text-gray-900 tracking-tight">Smart Alerts</h2>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {alerts.map((alert: any) => (
                  <div key={alert.product_id} className="bg-white p-4 rounded-[1.5rem] border border-red-50 shadow-sm flex items-center gap-4 group cursor-pointer" onClick={() => navigate(`/products/${alert.product_id}`)}>
                    <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center text-red-500 group-hover:bg-red-500 group-hover:text-white transition-colors">
                      <Zap className="h-6 w-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-black text-red-600 uppercase tracking-widest">{alert.price_drop ? 'Price Drop!' : 'Restocked!'}</p>
                      <p className="font-bold text-gray-900 text-sm truncate">{alert.name}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-300" />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Popular Near You (from redundant dashboard) */}
          <section className="space-y-6">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-3">
                <div className="w-2 h-8 bg-purple-600 rounded-full" />
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">Popular Near You</h2>
              </div>
            </div>
            {recLoading ? (
              <div className="flex gap-4 overflow-hidden">
                {[1,2,3,4].map(i => <div key={i} className="w-44 h-60 bg-gray-100 rounded-3xl shrink-0" />)}
              </div>
            ) : recommended?.length > 0 ? (
              <div className="flex gap-5 overflow-x-auto pb-6 snap-x no-scrollbar">
                {recommended.map((prod: any) => (
                  <button 
                    key={prod.id} 
                    onClick={() => navigate(`/products/${prod.id}`)}
                    className="w-44 shrink-0 bg-white p-3 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-500 snap-start group text-left"
                  >
                    <div className="w-full aspect-[4/5] rounded-2xl overflow-hidden bg-gray-50 mb-3 border border-gray-50">
                      <img 
                        src={prod.images[0] || 'https://placehold.co/200'} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                      />
                    </div>
                    <p className="font-bold text-gray-900 text-sm truncate mb-1">{prod.name}</p>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-black text-blue-600">₹{prod.price}</p>
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        <span className="text-[10px] font-bold text-gray-500">{prod.average_rating?.toFixed(1) || '0.0'}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
               <div className="p-10 text-center bg-gray-50/50 rounded-[2.5rem] border border-dashed border-gray-200 text-gray-400 font-medium">
                 No recommendations for your current location yet.
               </div>
            )}
          </section>
        </div>

        {/* Right Column: Sidebar */}
        <div className="space-y-10">
          
          {/* Quick Actions */}
          <section className="space-y-4">
             <h2 className="text-lg font-black text-gray-900 tracking-tight px-2">Quick Actions</h2>
             <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Map', icon: MapPin, color: 'text-green-600 bg-green-50', path: '/map' },
                  { label: 'Wishlist', icon: Heart, color: 'text-red-500 bg-red-50', path: '/wishlist' },
                  { label: 'Support', icon: Search, color: 'text-indigo-600 bg-indigo-50', path: '/chat' },
                  { label: 'Hot', icon: Zap, color: 'text-amber-600 bg-amber-50', path: '/emergency' },
                ].map((act, i) => (
                  <button 
                    key={i}
                    onClick={() => navigate(act.path)}
                    className="flex flex-col items-center justify-center p-5 bg-white border border-gray-100 rounded-[2rem] hover:border-blue-200 hover:shadow-lg transition-all group"
                  >
                    <div className={`p-4 rounded-2xl mb-3 group-hover:scale-110 group-hover:rotate-6 transition-all ${act.color}`}>
                      <act.icon className="h-6 w-6" />
                    </div>
                    <span className="text-xs font-black text-gray-800 tracking-wide uppercase">{act.label}</span>
                  </button>
                ))}
             </div>
          </section>

          {/* Top Stores */}
          <section className="space-y-5">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-lg font-black text-gray-900 tracking-tight">Partner Stores</h2>
              <Link to="/search" className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline">
                Explore
              </Link>
            </div>
            <div className="space-y-3">
              {nearbyStores.length > 0 ? (
                nearbyStores.map((store: any) => (
                  <button 
                    key={store.store_id} 
                    onClick={() => navigate(`/stores/${store.store_id}`)}
                    className="w-full bg-white p-5 rounded-[1.75rem] border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                        <ShoppingBag className="h-5 w-5" />
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-gray-900 text-sm group-hover:text-blue-600 transition">{store.store_name}</p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{store.city || 'Local Area'}</p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-200 group-hover:text-blue-600 group-hover:translate-x-1 transition" />
                  </button>
                ))
              ) : (
                <div className="bg-gray-50/50 rounded-[1.75rem] p-10 text-center border border-dashed border-gray-200">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Searching partners...</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
