import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, Cell, AreaChart, Area 
} from "recharts"
import { format, parseISO } from "date-fns"
import { motion } from "framer-motion"
import { 
  TrendingUp, 
  ShoppingBag, 
  CheckCircle, 
  Clock, 
  IndianRupee, 
  Award,
  ChevronUp,
  AlertCircle
} from "lucide-react"
import api from "../../lib/axios"

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<"week" | "month">("week")

  const { data: analytics, isLoading: analyticsLoading, isError: analyticsError } = useQuery({
    queryKey: ["vendor", "analytics"],
    queryFn: () => api.get("/vendors/me/analytics").then((r) => r.data),
  })

  const { data: chartData, isLoading: chartLoading } = useQuery({
    queryKey: ["vendor", "analytics", "chart", period],
    queryFn: () => api.get("/vendors/me/analytics/chart", { params: { period } }).then((r) => r.data),
  })

  if (analyticsLoading || chartLoading) {
    return (
      <div className="p-8 space-y-8 animate-pulse">
        <div className="h-10 bg-gray-200 rounded-xl w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-32 bg-gray-200 rounded-2xl" />)}
        </div>
        <div className="h-96 bg-gray-200 rounded-3xl" />
      </div>
    )
  }

  if (analyticsError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="p-4 bg-red-50 rounded-full mb-4">
          <AlertCircle className="h-12 w-12 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Failed to load analytics</h2>
        <p className="text-gray-500 mt-2">Please check your connection and try again.</p>
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

  const formattedChartData = chartData?.map((item: any) => ({
    ...item,
    formattedDate: format(parseISO(item.date), "MMM d")
  })) || []

  const topProducts = analytics?.top_5_products.map((item: any) => ({
    name: item.product_name.length > 12 ? item.product_name.substring(0, 12) + "..." : item.product_name,
    quantity: item.total_quantity
  })) || []

  const peakHours = analytics?.peak_hours.map((item: any) => ({
    hourLabel: item.hour === 0 ? "12 AM" : item.hour < 12 ? `${item.hour} AM` : item.hour === 12 ? "12 PM" : `${item.hour - 12} PM`,
    count: item.count
  })) || []

  const maxPeakCount = Math.max(...peakHours.map((h: any) => h.count), 0)
  const busiestHour = peakHours.find((h: any) => h.count === maxPeakCount)

  return (
    <motion.div 
      initial="initial"
      animate="animate"
      className="max-w-7xl mx-auto space-y-8 pb-20"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Business Intelligence</h1>
          <p className="text-gray-500 text-sm mt-1">Real-time performance metrics for your store.</p>
        </div>
        <div className="flex bg-white p-1 rounded-xl shadow-sm border border-gray-200">
          <button
            onClick={() => setPeriod("week")}
            className={`px-6 py-2 text-xs font-bold rounded-lg transition-all ${period === "week" ? "bg-indigo-600 text-white shadow-md" : "text-gray-500 hover:text-gray-900"}`}
          >
            WEEKLY
          </button>
          <button
            onClick={() => setPeriod("month")}
            className={`px-6 py-2 text-xs font-bold rounded-lg transition-all ${period === "month" ? "bg-indigo-600 text-white shadow-md" : "text-gray-500 hover:text-gray-900"}`}
          >
            MONTHLY
          </button>
        </div>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div variants={fadeInUp} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group">
          <div className="relative z-10">
            <div className="p-3 bg-indigo-50 rounded-2xl w-fit mb-4 group-hover:scale-110 transition-transform">
              <IndianRupee className="h-6 w-6 text-indigo-600" />
            </div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Revenue (MTD)</p>
            <h3 className="text-2xl font-black text-gray-900 mt-1">{formatCurrency(analytics?.revenue_this_month)}</h3>
            <div className="flex items-center gap-1 text-green-500 text-[10px] font-bold mt-2">
              <ChevronUp className="h-3 w-3" /> 12% vs last month
            </div>
          </div>
          <div className="absolute -right-4 -bottom-4 text-indigo-50 opacity-50 group-hover:scale-125 transition-transform">
            <IndianRupee size={120} strokeWidth={4} />
          </div>
        </motion.div>

        <motion.div variants={fadeInUp} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group">
          <div className="relative z-10">
            <div className="p-3 bg-green-50 rounded-2xl w-fit mb-4 group-hover:scale-110 transition-transform">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Success Rate</p>
            <h3 className="text-2xl font-black text-gray-900 mt-1">{analytics?.completion_rate}%</h3>
            <div className="w-full bg-gray-100 h-1.5 rounded-full mt-4 overflow-hidden">
              <div className="bg-green-500 h-full rounded-full" style={{ width: `${analytics?.completion_rate}%` }} />
            </div>
          </div>
        </motion.div>

        <motion.div variants={fadeInUp} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group">
          <div className="relative z-10">
            <div className="p-3 bg-amber-50 rounded-2xl w-fit mb-4 group-hover:scale-110 transition-transform">
              <Clock className="h-6 w-6 text-amber-600" />
            </div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Peak Activity</p>
            <h3 className="text-2xl font-black text-gray-900 mt-1">{busiestHour?.hourLabel || "N/A"}</h3>
            <p className="text-[10px] font-medium text-gray-500 mt-2">Highest customer traffic time</p>
          </div>
        </motion.div>

        <motion.div variants={fadeInUp} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group">
          <div className="relative z-10">
            <div className="p-3 bg-purple-50 rounded-2xl w-fit mb-4 group-hover:scale-110 transition-transform">
              <Award className="h-6 w-6 text-purple-600" />
            </div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Top Selling</p>
            <h3 className="text-xl font-black text-gray-900 mt-1 truncate">{topProducts[0]?.name || "N/A"}</h3>
            <p className="text-[10px] font-medium text-gray-500 mt-2">{topProducts[0]?.quantity || 0} units reserved</p>
          </div>
        </motion.div>
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <motion.div variants={fadeInUp} className="lg:col-span-2 bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold text-gray-900">Reservation Trends</h2>
            <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest">
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-indigo-500" /> Total</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-green-500" /> Completed</div>
            </div>
          </div>
          <div className="h-[350px]">
            {formattedChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-400 italic">Insufficient data for trend analysis</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={formattedChartData}>
                  <defs>
                    <linearGradient id="colorRes" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorComp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="formattedDate" tick={{fontSize: 10, fontWeight: 700}} tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tick={{fontSize: 10, fontWeight: 700}} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} 
                    itemStyle={{fontSize: '12px', fontWeight: 700}}
                  />
                  <Area type="monotone" dataKey="reservations" name="Total" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#colorRes)" />
                  <Area type="monotone" dataKey="completed" name="Completed" stroke="#22c55e" strokeWidth={4} fillOpacity={1} fill="url(#colorComp)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>

        <div className="space-y-8">
          <motion.div variants={fadeInUp} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-6">Top Performing</h2>
            <div className="space-y-4">
              {topProducts.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-10 italic">No sales data yet</p>
              ) : (
                topProducts.map((p: any, i: number) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-xs font-bold text-gray-400">#{i+1}</div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-gray-800">{p.name}</p>
                      <div className="w-full bg-gray-50 h-1 rounded-full mt-1">
                        <div className="bg-indigo-400 h-full rounded-full" style={{ width: `${(p.quantity / topProducts[0].quantity) * 100}%` }} />
                      </div>
                    </div>
                    <span className="text-xs font-black text-gray-900">{p.quantity}</span>
                  </div>
                ))
              )}
            </div>
          </motion.div>

          <motion.div variants={fadeInUp} className="bg-indigo-600 p-8 rounded-3xl text-white shadow-xl shadow-indigo-200 relative overflow-hidden">
            <div className="relative z-10">
              <TrendingUp className="h-10 w-10 mb-4 opacity-50" />
              <h3 className="text-xl font-bold">Smart Insight</h3>
              <p className="text-indigo-100 text-sm mt-2 leading-relaxed">
                Your store gets the most reservations at <b>{busiestHour?.hourLabel || "peak times"}</b>. 
                Try updating your stock inventory before these hours to maximize saves!
              </p>
            </div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl" />
          </motion.div>
        </div>
      </div>
    </motion.div>
  )
}
