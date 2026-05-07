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

  const quickLinks = [
    { icon: Search, label: 'Search Products', to: '/search', color: 'bg-blue-50 text-blue-600' },
    { icon: Heart, label: 'My Wishlist', to: '/wishlist', color: 'bg-red-50 text-red-500' },
    { icon: MapPin, label: 'Nearby Stores', to: '/map', color: 'bg-green-50 text-green-600' },
  ]

  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-20 bg-gray-200 rounded-2xl" />)}
        </div>
        <div className="h-48 bg-gray-200 rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Welcome */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Hello, {user?.name?.split(' ')[0] ?? 'there'} 👋
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            Discover products from stores near you.
          </p>
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-xs font-bold text-gray-400 uppercase">Your Impact</p>
          <p className="text-sm font-medium text-blue-600">{dashboard?.stats?.completed_reservations || 0} items saved</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Bookings" value={dashboard?.stats?.total_reservations || 0} icon={ShoppingBag} color="bg-blue-50 text-blue-600" />
        <StatCard label="Wishlist" value={dashboard?.stats?.active_wishlist_items || 0} icon={Heart} color="bg-red-50 text-red-500" />
        <StatCard label="Nearby Stores" value={dashboard?.nearby_stores_preview?.length || 0} icon={MapPin} color="bg-green-50 text-green-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Active Reservations */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Active Reservations</h2>
            <Link to="/reservations" className="text-sm font-medium text-blue-600 hover:underline flex items-center">
              View all <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="space-y-3">
            {dashboard?.active_reservations?.length > 0 ? (
              dashboard.active_reservations.map((res: any) => (
                <div key={res.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-50 shrink-0">
                    {res.items[0]?.image_url ? (
                      <img src={res.items[0].image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xl">📦</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900 truncate">{res.items[0]?.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        res.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {res.status}
                      </span>
                      {res.countdown_seconds > 0 && (
                        <div className="flex items-center gap-1 text-[10px] text-gray-500">
                          <Clock className="h-3 w-3" />
                          {Math.floor(res.countdown_seconds / 60)}m left
                        </div>
                      )}
                    </div>
                  </div>
                  <button onClick={() => navigate('/reservations')} className="p-2 hover:bg-gray-50 rounded-full transition text-gray-400">
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              ))
            ) : (
              <div className="bg-blue-50/50 rounded-2xl p-8 text-center border border-dashed border-blue-200">
                <ShoppingBag className="h-10 w-10 text-blue-200 mx-auto mb-2" />
                <p className="text-sm text-blue-700 font-medium">No active reservations</p>
                <button onClick={() => navigate('/search')} className="mt-2 text-xs text-blue-600 hover:underline">Browse products &rarr;</button>
              </div>
            )}
          </div>
        </div>

        {/* Nearby Stores */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Recommended Stores</h2>
            <Link to="/map" className="text-sm font-medium text-blue-600 hover:underline flex items-center">
              Open map <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {dashboard?.nearby_stores_preview?.length > 0 ? (
              dashboard.nearby_stores_preview.map((store: any) => (
                <div key={store.store_id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-gray-900">{store.store_name}</p>
                      <p className="text-xs text-gray-500">{store.city || 'Local Store'}</p>
                    </div>
                  </div>
                  <button onClick={() => navigate(`/stores/${store.store_id}`)} className="px-4 py-1.5 bg-gray-50 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-100 transition">
                    View
                  </button>
                </div>
              ))
            ) : (
              <div className="bg-gray-50 rounded-2xl p-8 text-center border border-dashed border-gray-200">
                <MapPin className="h-10 w-10 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-500 font-medium">Finding stores near you...</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick links & CTA banner */}
      <div className="space-y-4 pt-4 border-t border-gray-100">
        <h2 className="text-lg font-bold text-gray-900">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {quickLinks.map(({ icon: Icon, label, to, color }) => (
            <button
              key={to}
              onClick={() => navigate(to)}
              className="flex items-center gap-4 p-5 bg-white border border-gray-200 rounded-2xl hover:shadow-md transition text-left"
            >
              <div className={`p-3 rounded-xl ${color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <span className="font-medium text-gray-800 text-sm">{label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl">
        <div className="relative z-10 max-w-sm">
          <h2 className="text-2xl font-bold leading-tight">Save items from landfill today!</h2>
          <p className="text-blue-100 text-sm mt-2">
            Local vendors are listing items that might go to waste. Help the planet and save money.
          </p>
          <button
            onClick={() => navigate('/search')}
            className="mt-6 px-6 py-3 bg-white text-blue-600 font-bold rounded-xl text-sm hover:bg-blue-50 transition shadow-lg"
          >
            Start Browsing
          </button>
        </div>
        {/* Abstract shapes for premium look */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-32 h-32 bg-blue-400/20 rounded-full mr-10 mb-10 blur-2xl" />
      </div>
    </div>
  )
}
