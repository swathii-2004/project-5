import { Outlet, Link, useLocation, useNavigate, NavLink } from "react-router-dom"
import { 
  LayoutDashboard, 
  UserCheck, 
  Users, 
  BarChart3, 
  LogOut,
  ShieldCheck,
  Menu,
  X,
  UserCircle,
  Bell
} from "lucide-react"
import { useState } from "react"
import { useAuthStore } from "../../store/authStore"
import NotificationBell from "../../components/shared/NotificationBell"

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
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex md:w-72 md:flex-col md:fixed md:inset-y-0 bg-slate-950 text-white shadow-2xl z-50">
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center h-20 flex-shrink-0 px-6 bg-slate-950 border-b border-slate-800/50">
            <div className="p-2 bg-blue-500 rounded-xl mr-3 shadow-lg shadow-blue-500/20">
              <ShieldCheck className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-black tracking-tight text-white uppercase">ProxiMart <span className="text-blue-400">Admin</span></span>
          </div>
          <nav className="mt-8 flex-1 px-4 space-y-2">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                className={({ isActive }) =>
                  `group flex items-center px-4 py-3.5 text-sm font-bold rounded-2xl transition-all duration-300 ${
                    isActive 
                      ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20 scale-[1.02]' 
                      : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                  }`
                }
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.name}
              </NavLink>
            ))}
          </nav>
        </div>
        
        <div className="p-6 border-t border-slate-800/50 bg-slate-950/50">
          <button 
            onClick={() => navigate('/profile')}
            className="flex items-center gap-3 mb-6 p-3 rounded-2xl bg-slate-900 hover:bg-slate-800 transition-all group"
          >
            <div className="h-10 w-10 rounded-xl bg-slate-800 group-hover:bg-blue-600 transition-colors flex items-center justify-center text-white font-bold">
              {user?.name?.[0] || 'A'}
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-xs font-bold text-white truncate">{user?.name || 'Administrator'}</p>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Root Access</p>
            </div>
          </button>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
          >
            <LogOut className="h-5 w-5" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 md:pl-72">
        {/* Desktop Header */}
        <header className="hidden md:flex items-center justify-between px-8 h-20 bg-white border-b border-gray-100 sticky top-0 z-40">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">
            System Control Panel <span className="text-gray-200">/</span> <span className="text-gray-900">{location.pathname.substring(1)}</span>
          </div>
          <div className="flex items-center gap-6">
            <NotificationBell />
            <div className="h-8 w-px bg-gray-100" />
            <button onClick={() => navigate('/profile')} className="p-2.5 bg-gray-50 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all">
              <UserCircle className="h-6 w-6" />
            </button>
          </div>
        </header>

        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between px-6 h-16 bg-slate-950 text-white sticky top-0 z-50">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-blue-400" />
            <span className="font-black tracking-tight text-sm uppercase">Admin</span>
          </div>
          <div className="flex items-center gap-4">
            <NotificationBell />
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 rounded-xl bg-slate-900">
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {isMobileMenuOpen && (
          <div className="md:hidden fixed inset-0 top-16 z-50 bg-slate-950 p-6 space-y-2 animate-in slide-in-from-top">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-4 px-6 py-4 rounded-2xl text-sm font-bold ${
                    isActive ? 'bg-blue-600 text-white' : 'text-slate-400'
                  }`
                }
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </NavLink>
            ))}
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-sm font-bold text-red-400"
            >
              <LogOut className="h-5 w-5" /> Sign Out
            </button>
          </div>
        )}

        <main className="flex-1 p-6 lg:p-10">
          <Outlet />
        </main>
      </div>
    </div>
  )
}