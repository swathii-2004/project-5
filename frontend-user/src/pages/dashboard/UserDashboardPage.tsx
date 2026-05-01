import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { Search, Heart, MapPin } from 'lucide-react'

export default function UserDashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const quickLinks = [
    { icon: Search, label: 'Search Products', to: '/search', color: 'bg-blue-50 text-blue-600' },
    { icon: Heart, label: 'My Wishlist', to: '/wishlist', color: 'bg-red-50 text-red-500' },
    { icon: MapPin, label: 'Nearby Stores', to: '/map', color: 'bg-green-50 text-green-600' },
  ]

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Hello, {user?.name?.split(' ')[0] ?? 'there'} 👋
        </h1>
        <p className="text-gray-500 mt-1 text-sm">
          Discover products from stores near you.
        </p>
      </div>

      {/* Quick links */}
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

      {/* CTA banner */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="font-bold text-lg">Explore What's Nearby</h2>
          <p className="text-blue-100 text-sm mt-1">
            Browse groceries, dairy, electronics, and more from local vendors.
          </p>
        </div>
        <button
          onClick={() => navigate('/search')}
          className="shrink-0 px-5 py-2.5 bg-white text-blue-600 font-semibold rounded-xl text-sm hover:bg-blue-50 transition"
        >
          Browse Now →
        </button>
      </div>
    </div>
  )
}
