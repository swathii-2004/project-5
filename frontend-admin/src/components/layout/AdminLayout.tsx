import { Outlet, Link, useLocation, useNavigate } from "react-router-dom"
import { 
  LayoutDashboard, 
  UserCheck, 
  Users, 
  BarChart3, 
  LogOut,
  ShieldCheck,
  Menu,
  X
} from "lucide-react"
import { useState } from "react"
import { useAuthStore } from "../../store/authStore"

export default function AdminLayout() {
  const { logout, user } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Vendor Approvals', href: '/approvals', icon: UserCheck },
    { name: 'User Management', href: '/users', icon: Users },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  ]

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar for desktop */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-slate-900 text-white">
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center h-16 flex-shrink-0 px-4 bg-slate-950">
            <ShieldCheck className="h-8 w-8 text-blue-400" />
            <span className="ml-3 text-lg font-bold tracking-wider text-white">PROXIMART <span className="text-blue-400">ADMIN</span></span>
          </div>
          <nav className="mt-5 flex-1 px-2 space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`${
                  location.pathname === item.href
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                } group flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200`}
              >
                <item.icon
                  className={`${
                    location.pathname === item.href ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-300'
                  } mr-3 flex-shrink-0 h-5 w-5`}
                  aria-hidden="true"
                />
                {item.name}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex-shrink-0 flex bg-slate-800 p-4">
          <div className="flex-shrink-0 w-full group block">
            <div className="flex items-center">
              <div className="inline-block h-9 w-9 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 font-bold">
                {user?.name?.[0] || 'A'}
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-white">{user?.name || 'Administrator'}</p>
                <button 
                  onClick={handleLogout}
                  className="text-xs font-medium text-slate-400 group-hover:text-slate-300 flex items-center gap-1 mt-0.5"
                >
                  <LogOut className="h-3 w-3" /> Sign out
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile menu */}
      <div className="md:hidden flex flex-col w-full">
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
          <div className="flex items-center">
            <ShieldCheck className="h-6 w-6 text-blue-400" />
            <span className="ml-2 text-sm font-bold tracking-wider">PROXIMART ADMIN</span>
          </div>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-1">
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
        
        {isMobileMenuOpen && (
          <div className="bg-slate-800 p-2 space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`${
                  location.pathname === item.href
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                } block px-3 py-2 rounded-lg text-base font-medium`}
              >
                {item.name}
              </Link>
            ))}
            <button 
              onClick={handleLogout}
              className="w-full text-left px-3 py-2 rounded-lg text-base font-medium text-red-400 hover:bg-slate-700"
            >
              Sign out
            </button>
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="flex flex-col flex-1 md:pl-64">
        <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}