import { useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search, Heart, MapPin, Clock, ShoppingBag, ChevronRight } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import api from '../../lib/axios'

function StatCard({ label, value, icon: Icon, color }: any) {
  return (
    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs font-medium text-gray-500 uppercase">{label}</p>
        <p className="text-xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  )
}

export default function UserDashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['user-dashboard'],
    queryFn: () => api.get('/users/me/dashboard').then(r => r.data)
  })

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto space-y-8 animate-pulse p-4">
        <div className="h-32 bg-gray-100 rounded-[2.5rem]" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="h-64 bg-gray-100 rounded-3xl" />
          <div className="h-64 bg-gray-100 rounded-3xl" />
        </div>
      </div>
    )
  }

  const stats = dashboard?.stats || { total_reservations: 0, completed_reservations: 0, active_wishlist_items: 0 }
  const activeRes = dashboard?.active_reservations || []
  const nearbyStores = dashboard?.nearby_stores_preview || []

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20">
      {/* Hero Header */}
      <div className="relative bg-white rounded-[2.5rem] p-8 md:p-12 overflow-hidden border border-gray-100 shadow-sm">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">
              Hello, <span className="text-blue-600">{user?.name?.split(' ')[0] || 'User'}</span> 👋
            </h1>
            <p className="text-gray-500 font-medium">
              Ready to save some items today?
            </p>
          </div>
          
          <div className="flex gap-4 md:gap-8 overflow-x-auto pb-2 md:pb-0">
            <div className="text-center px-4">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Bookings</p>
              <p className="text-2xl font-black text-gray-900">{stats.total_reservations}</p>
            </div>
            <div className="w-px h-10 bg-gray-100 hidden md:block" />
            <div className="text-center px-4">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Impact</p>
              <p className="text-2xl font-black text-blue-600">{stats.completed_reservations}</p>
            </div>
            <div className="w-px h-10 bg-gray-100 hidden md:block" />
            <div className="text-center px-4">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Wishlist</p>
              <p className="text-2xl font-black text-red-500">{stats.active_wishlist_items}</p>
            </div>
          </div>
        </div>
        
        {/* Background Elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl -mr-32 -mt-32 opacity-50" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content (Left) */}
        <div className="lg:col-span-2 space-y-10">
          {/* Active Reservations */}
          <section className="space-y-5">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-xl font-black text-gray-900 tracking-tight">Active Reservations</h2>
              <Link to="/reservations" className="text-sm font-bold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-full transition flex items-center gap-1">
                View All <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {activeRes.length > 0 ? (
                activeRes.map((res: any) => (
                  <button 
                    key={res.id} 
                    onClick={() => navigate('/reservations')}
                    className="group bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 flex items-center gap-5 text-left"
                  >
                    <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gray-50 shrink-0 border border-gray-50">
                      {res.items[0]?.image_url ? (
                        <img src={res.items[0].image_url} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 truncate">{res.items[0]?.name}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider ${
                          res.status === 'confirmed' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'
                        }`}>
                          {res.status}
                        </span>
                        {res.countdown_seconds > 0 && (
                          <div className="flex items-center gap-1 text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                            <Clock className="h-3 w-3" />
                            {Math.floor(res.countdown_seconds / 60)}m left
                          </div>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-blue-600 transition" />
                  </button>
                ))
              ) : (
                <div className="bg-gray-50 rounded-[2rem] p-10 text-center border-2 border-dashed border-gray-200">
                  <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-4">
                    <ShoppingBag className="h-8 w-8 text-gray-200" />
                  </div>
                  <p className="text-gray-500 font-bold text-sm">No items reserved yet</p>
                  <button 
                    onClick={() => navigate('/search')}
                    className="mt-4 px-6 py-2 bg-blue-600 text-white font-bold rounded-xl text-xs hover:bg-blue-700 transition shadow-lg"
                  >
                    Explore Stores
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* CTA Banner */}
          <div className="bg-gradient-to-br from-indigo-600 via-blue-600 to-blue-500 rounded-[2.5rem] p-8 md:p-10 text-white relative overflow-hidden shadow-xl shadow-blue-100">
            <div className="relative z-10 max-w-sm space-y-4">
              <h2 className="text-2xl md:text-3xl font-black leading-tight tracking-tight">Save items from landfill today!</h2>
              <p className="text-blue-100 font-medium text-sm leading-relaxed">
                Local vendors are listing items that might go to waste. Help the planet and save money.
              </p>
              <button
                onClick={() => navigate('/search')}
                className="px-8 py-3.5 bg-white text-blue-600 font-black rounded-2xl text-sm hover:shadow-xl transition transform hover:-translate-y-0.5 active:scale-95"
              >
                START BROWSING
              </button>
            </div>
            
            {/* Abstract Decorative Shapes */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32" />
            <div className="absolute bottom-0 right-0 w-48 h-48 bg-blue-400/20 rounded-full blur-2xl mr-10 mb-10" />
          </div>
        </div>

        {/* Sidebar Content (Right) */}
        <div className="space-y-10">
          {/* Nearby Stores */}
          <section className="space-y-5">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-xl font-black text-gray-900 tracking-tight">Top Stores</h2>
              <Link to="/map" className="text-xs font-bold text-blue-600 uppercase tracking-widest hover:underline">
                View Map
              </Link>
            </div>
            
            <div className="space-y-3">
              {nearbyStores.length > 0 ? (
                nearbyStores.map((store: any) => (
                  <button 
                    key={store.store_id} 
                    onClick={() => navigate(`/stores/${store.store_id}`)}
                    className="w-full bg-white p-4 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                        <MapPin className="h-6 w-6" />
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-gray-900 text-sm truncate max-w-[120px]">{store.store_name}</p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{store.city || 'Local'}</p>
                      </div>
                    </div>
                    <div className="p-2 bg-gray-50 rounded-xl group-hover:bg-blue-50 group-hover:text-blue-600 transition">
                      <ChevronRight className="h-4 w-4" />
                    </div>
                  </button>
                ))
              ) : (
                <div className="bg-gray-50/50 rounded-3xl p-8 text-center border border-dashed border-gray-200">
                  <MapPin className="h-8 w-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Searching stores...</p>
                </div>
              )}
            </div>
          </section>

          {/* Categories Grid */}
          <section className="space-y-5">
            <h2 className="text-xl font-black text-gray-900 tracking-tight px-2">Quick Search</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Grocery', icon: ShoppingBag, color: 'text-green-600 bg-green-50' },
                { label: 'Electronics', icon: Search, color: 'text-blue-600 bg-blue-50' },
                { label: 'Favorites', icon: Heart, color: 'text-red-500 bg-red-50' },
                { label: 'Near Me', icon: MapPin, color: 'text-indigo-600 bg-indigo-50' },
              ].map((cat, i) => (
                <button 
                  key={i}
                  onClick={() => navigate('/search')}
                  className="flex flex-col items-center justify-center p-4 bg-white border border-gray-100 rounded-3xl hover:border-blue-200 hover:shadow-sm transition-all group"
                >
                  <div className={`p-3 rounded-2xl mb-2 group-hover:scale-110 transition-transform ${cat.color}`}>
                    <cat.icon className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-bold text-gray-700">{cat.label}</span>
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
