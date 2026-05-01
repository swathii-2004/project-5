import { useQuery } from "@tanstack/react-query"
import { Users, Store, Clock, Package, ShoppingBag, IndianRupee, Info } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts"
import api from "../../lib/api"

export default function AnalyticsPage() {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ["admin", "analytics"],
    queryFn: () => api.get("/admin/analytics/overview").then((r) => r.data),
  })

  if (isLoading) {
    return <div className="p-8 text-center animate-pulse">Loading analytics...</div>
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(val || 0)
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

  // Calculate status counts from recent_reservations for the chart as a placeholder
  // In a real scenario, this would come from a specific endpoint
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
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Platform Analytics</h1>

      {/* Row 1: 6 stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 flex flex-col justify-center shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500 uppercase">Users</span>
            <Users className="h-4 w-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{total_users}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 flex flex-col justify-center shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500 uppercase">Vendors</span>
            <Store className="h-4 w-4 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{total_vendors_active}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 flex flex-col justify-center shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500 uppercase">Pending</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{total_vendors_pending}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 flex flex-col justify-center shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500 uppercase">Products</span>
            <Package className="h-4 w-4 text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{total_products}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 flex flex-col justify-center shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500 uppercase">Today</span>
            <ShoppingBag className="h-4 w-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{total_reservations_today}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 flex flex-col justify-center shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500 uppercase">Revenue</span>
            <IndianRupee className="h-4 w-4 text-green-500" />
          </div>
          <p className="text-xl font-bold text-gray-900 truncate" title={formatCurrency(total_revenue)}>{formatCurrency(total_revenue)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-6">Recent Reservation Status</h2>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="status" tick={{fontSize: 12}} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tick={{fontSize: 12}} tickLine={false} axisLine={false} />
                <Tooltip cursor={{fill: '#f3f4f6'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                <Bar dataKey="count" name="Count" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 flex flex-col">
          <div className="flex items-center gap-3 text-blue-600 mb-4">
            <Info className="h-6 w-6" />
            <h2 className="text-lg font-bold">More Details</h2>
          </div>
          <p className="text-blue-800 text-sm leading-relaxed mb-4">
            Detailed per-vendor analytics are available directly in the vendor portal. Vendors can see their specific sales trends, top products, and peak operating hours.
          </p>
          <p className="text-blue-800 text-sm leading-relaxed">
            As an administrator, you have a bird's-eye view of the platform's overall health and performance. Use this dashboard to monitor aggregate statistics.
          </p>
        </div>
      </div>
    </div>
  )
}