import { Outlet, useNavigate, NavLink, useSearchParams } from 'react-router-dom'
import { useState, useRef } from 'react'
import { Heart, Home, Search, Map, ClipboardList, AlertTriangle, MessageSquare } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import OfflineBanner from '../shared/OfflineBanner'
import NotificationBell from '../shared/NotificationBell'
import { useFirebaseMessaging } from '../../hooks/useFirebaseMessaging'

export default function UserLayout() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [searchParams] = useSearchParams()
  const [searchVal, setSearchVal] = useState(searchParams.get('q') ?? '')
  const inputRef = useRef<HTMLInputElement>(null)

  useFirebaseMessaging()

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchVal.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchVal.trim())}`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* ── Top Navbar ── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm h-16">
        <div className="max-w-7xl mx-auto h-full flex items-center gap-4 px-4">
          {/* Logo */}
          <button
            onClick={() => navigate('/dashboard')}
            className="text-xl font-bold text-blue-600 shrink-0 tracking-tight"
          >
            ProxiMart
          </button>

          {/* Search bar */}
          <div className="flex-1 max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={searchVal}
                onChange={e => setSearchVal(e.target.value)}
                onKeyDown={handleSearch}
                placeholder="Search for products..."
                className="w-full pl-9 pr-4 py-2 text-sm bg-gray-100 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
              />
              {searchVal && (
                <button
                  onClick={() => setSearchVal('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-medium"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => navigate('/chat')}
              className="p-2 rounded-full hover:bg-gray-100 text-gray-600 transition"
              aria-label="Chat"
            >
              <MessageSquare className="h-5 w-5" />
            </button>
            <button
              onClick={() => navigate('/wishlist')}
              className="p-2 rounded-full hover:bg-gray-100 text-gray-600 transition"
              aria-label="Wishlist"
            >
              <Heart className="h-5 w-5" />
            </button>
            <NotificationBell />
            <div className="hidden md:flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-semibold">
                {user?.name?.[0]?.toUpperCase() ?? 'U'}
              </div>
              <span className="text-sm font-medium text-gray-700 max-w-[120px] truncate">
                {user?.name ?? 'User'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* ── Page content ── */}
      <OfflineBanner />
      <main className="flex-1 pt-16 pb-16 md:pb-0">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <Outlet />
        </div>
      </main>

      {/* ── Mobile bottom nav ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 md:hidden">
        <div className="flex items-center justify-around h-14">
          {[
            { to: '/dashboard', Icon: Home, label: 'Home' },
            { to: '/search', Icon: Search, label: 'Search' },
            { to: '/map', Icon: Map, label: 'Map' },
            { to: '/reservations', Icon: ClipboardList, label: 'Orders' },
            { to: '/emergency', Icon: AlertTriangle, label: 'Emergency' },
          ].map(({ to, Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-3 py-1 text-xs font-medium transition ${
                  isActive ? 'text-blue-600' : 'text-gray-500'
                }`
              }
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
