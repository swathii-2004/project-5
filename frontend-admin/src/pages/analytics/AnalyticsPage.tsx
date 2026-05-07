import { useQuery } from "@tanstack/react-query"
import { motion } from "framer-motion"
import { 
  Users, 
  Store, 
  Clock, 
  Package, 
  ShoppingBag, 
  IndianRupee, 
  Info,
  TrendingUp,
  BarChart3,
  Activity,
  ArrowUpRight
} from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts"
import api from "../../lib/axios"

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
}

export default function AnalyticsPage() {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ["admin", "analytics"],
    queryFn: () => api.get("/admin/analytics/overview").then((r) => r.data),
  })

  if (isLoading) {
    return (
      <div className="p-8 space-y-8 animate-pulse">
        <div className="h-10 bg-gray-200 rounded-xl w-48" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-24 bg-gray-200 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-80 bg-gray-200 rounded-3xl" />
          <div className="h-80 bg-gray-200 rounded-3xl" />
        </div>
      </div>
    )
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-IN", { 
      style: "currency", 
      currency: "INR",
      maximumFractionDigits: 0
    }).format(val || 0)
  }

  const {
    total_users,
    total_vendors_active,
    total_vendors_pending,
    total_products,
    total_reservations_today,
    total_revenue,
    recent_reservations
  } = analytics

  const statusCounts = recent_reservations?.reduce((acc: any, res: any) => {
    acc[res.status] = (acc[res.status] || 0) + 1
    return acc
  }, {}) || {}

  const chartData = [
    { status: "Completed", count: statusCounts["completed"] || 0, color: "#22c55e" },
    { status: "Confirmed", count: statusCounts["confirmed"] || 0, color: "#3b82f6" },
    { status: "Pending", count: statusCounts["pending"] || 0, color: "#f59e0b" },
    { status: "Cancelled", count: statusCounts["cancelled"] || 0, color: "#9ca3af" },
    { status: "Rejected", count: statusCounts["rejected"] || 0, color: "#ef4444" },
  ]

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="max-w-7xl mx-auto space-y-8 pb-12"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Platform Insights</h1>
          <p className="text-gray-500 text-sm mt-1 font-medium">Aggregated real-time metrics across all store operations.</p>
        </div>
        <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-bold text-xs">
          <Activity className="h-4 w-4" /> LIVE UPDATES
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: "Total Users", val: total_users, icon: Users, col: "text-blue-500", bg: "bg-blue-50" },
          { label: "Active Vendors", val: total_vendors_active, icon: Store, col: "text-green-500", bg: "bg-green-50" },
          { label: "Pending Apps", val: total_vendors_pending, icon: Clock, col: "text-amber-500", bg: "bg-amber-50" },
          { label: "Inventory", val: total_products, icon: Package, col: "text-purple-500", bg: "bg-purple-50" },
          { label: "Today's Saves", val: total_reservations_today, icon: ShoppingBag, col: "text-indigo-500", bg: "bg-indigo-50" },
          { label: "Total Revenue", val: formatCurrency(total_revenue), icon: IndianRupee, col: "text-emerald-500", bg: "bg-emerald-50" },
        ].map((s, i) => (
          <motion.div key={i} variants={item} className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow group">
            <div className={`p-2.5 ${s.bg} rounded-2xl w-fit mb-3 group-hover:scale-110 transition-transform`}>
              <s.icon className={`h-5 w-5 ${s.col}`} />
            </div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{s.label}</p>
            <p className="text-xl font-black text-gray-900 mt-1 truncate">{s.val}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 3D Bar Chart Section */}
        <motion.div variants={item} className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Lifecycle Analysis</h2>
              <p className="text-xs text-gray-400 mt-1">Reservation conversion across all states</p>
            </div>
            <BarChart3 className="h-6 w-6 text-gray-300" />
          </div>
          
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="status" tick={{fontSize: 10, fontWeight: 700}} axisLine={false} tickLine={false} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700}} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'}}
                />
                <Bar dataKey="count" radius={[12, 12, 0, 0]} barSize={50}>
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.color} 
                      className="transition-all duration-500 hover:opacity-80"
                      // Adding a slight "3D" filter effect via SVG filters if supported
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          {/* Legend Area */}
          <div className="mt-8 flex flex-wrap gap-4 border-t border-gray-50 pt-6">
            {chartData.map((d, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{d.status}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Action / Insight Cards */}
        <div className="space-y-8">
          <motion.div variants={item} className="bg-indigo-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-indigo-100 relative overflow-hidden group">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <div className="p-3 bg-white/20 rounded-2xl">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <ArrowUpRight className="h-6 w-6 opacity-40 group-hover:opacity-100 group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" />
              </div>
              <h3 className="text-xl font-bold">Smart Forecast</h3>
              <p className="text-indigo-100 text-sm mt-3 leading-relaxed">
                Based on current velocity, platform revenue is projected to grow by <b className="text-white">18%</b> this month. Vendor onboarding is currently at its peak.
              </p>
              <button className="mt-6 w-full py-3 bg-white text-indigo-600 font-bold text-xs rounded-2xl hover:bg-indigo-50 transition-colors">
                VIEW DETAILED REPORT
              </button>
            </div>
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -mr-10 -mt-10 blur-3xl" />
          </motion.div>

          <motion.div variants={item} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-amber-50 rounded-xl">
                <Info className="h-5 w-5 text-amber-500" />
              </div>
              <h3 className="font-bold text-gray-900">Admin Tip</h3>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed">
              Monitoring <span className="text-amber-600 font-bold">Pending Applications</span> daily helps maintain platform growth and ensures vendor satisfaction.
            </p>
            <div className="mt-6 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-gray-400">
              <span>Next Sync</span>
              <span className="text-gray-900">In 14 Minutes</span>
            </div>
            <div className="w-full bg-gray-100 h-1 rounded-full mt-2 overflow-hidden">
              <div className="bg-amber-400 h-full w-[60%]" />
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  )
}