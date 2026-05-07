import { Link, useNavigate, useLocation, Outlet, NavLink } from 'react-router-dom'
import { 
  LayoutDashboard, 
  Package, 
  ClipboardList, 
  Boxes, 
  BarChart2, 
  MessageSquare, 
  User,
  LogOut,
  Menu,
  X,
  Store,
  UserCircle
} from 'lucide-react'
import { useState } from 'react'
import { useAuthStore } from '../../store/authStore'
import NotificationBell from '../shared/NotificationBell'
import { useFirebaseMessaging } from '../../hooks/useFirebaseMessaging'

export default function VendorLayout() {
  useFirebaseMessaging()
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [isSidebarOpen, setSidebarOpen] = useState(false)

  const navItems = [
    { icon: LayoutDashboard, label: 'Overview', path: '/dashboard' },
    { icon: Package, label: 'Products', path: '/products' },
    { icon: ClipboardList, label: 'Reservations', path: '/reservations' },
    { icon: Boxes, label: 'Inventory', path: '/inventory' },
    { icon: BarChart2, label: 'Analytics', path: '/analytics' },
    { icon: MessageSquare, label: 'Customer Chat', path: '/chat' },
  ]

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-gray-200 fixed inset-y-0 shadow-sm">
        <div className="p-6">
          <div className="flex items-center gap-3 text-indigo-600 mb-8">
            <div className="p-2 bg-indigo-50 rounded-xl">
              <Store className="h-6 w-6" />
            </div>
            <span className="text-xl font-bold tracking-tight">ProxiMart</span>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200 scale-[1.02]"
                      : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                  }`
                }
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-6 border-t border-gray-100">
          <div className="flex items-center gap-3 mb-6 p-2 rounded-xl bg-gray-50">
            <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
              {user?.name?.[0].toUpperCase() ?? 'S'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate">
                {user?.store_name || user?.name || 'Store'}
              </p>
              <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Vendor Portal</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full text-left text-sm font-bold text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
          >
            <LogOut className="h-5 w-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 z-40">
        <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg hover:bg-gray-100 transition">
          <Menu className="h-6 w-6 text-gray-600" />
        </button>
        <span className="text-lg font-bold text-indigo-600">ProxiMart</span>
        <div className="flex items-center gap-2">
          <NotificationBell />
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="fixed inset-y-0 left-0 w-72 bg-white flex flex-col p-6 animate-in slide-in-from-left duration-300">
            <div className="flex items-center justify-between mb-8">
              <span className="text-xl font-bold text-indigo-600">ProxiMart</span>
              <button onClick={() => setSidebarOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="h-6 w-6 text-gray-500" />
              </button>
            </div>
            <nav className="flex-1 space-y-2">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                      isActive ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" : "text-gray-500 hover:bg-gray-100"
                    }`
                  }
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </NavLink>
              ))}
            </nav>
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 mt-auto text-sm font-bold text-gray-500 hover:text-red-600 rounded-xl"
            >
              <LogOut className="h-5 w-5" />
              Logout
            </button>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 lg:ml-64 min-h-screen">
        <header className="hidden lg:flex items-center justify-end px-8 h-16 bg-white border-b border-gray-200 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <NotificationBell />
            <div className="h-8 w-px bg-gray-200 mx-2" />
            <button onClick={() => navigate("/profile")} className="flex items-center gap-2 group">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-gray-900 group-hover:text-indigo-600 transition">{user?.name}</p>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Store Admin</p>
              </div>
              <div className="p-1.5 bg-gray-100 rounded-lg group-hover:bg-indigo-50 group-hover:text-indigo-600 transition">
                <UserCircle className="h-5 w-5" />
              </div>
            </button>
          </div>
        </header>

        <div className="p-4 lg:p-8 pt-20 lg:pt-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
