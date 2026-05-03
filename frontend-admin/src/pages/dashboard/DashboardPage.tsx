import { useQuery } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import { Users, Store, Clock, Package, ShoppingBag, IndianRupee } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import api from "../../lib/axios"

export default function DashboardPage() {
  const navigate = useNavigate()

  const { data: analytics, isLoading } = useQuery({
    queryKey: ["admin", "analytics"],
    queryFn: () => api.get("/admin/analytics/overview").then((r) => r.data),
  })

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse p-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-24 bg-gray-200 rounded-2xl" />)}
        </div>
        <div className="flex gap-4">
          <div className="h-32 bg-gray-200 rounded-2xl flex-1" />
          <div className="h-32 bg-gray-200 rounded-2xl flex-1" />
        </div>
        <div className="h-64 bg-gray-200 rounded-2xl w-full" />
      </div>
    )
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(val || 0)
  }

  const getCompletionRateColor = (rate: number) => {
    if (rate >= 80) return "text-green-600"
    if (rate >= 50) return "text-amber-500"
    return "text-red-600"
  }

  const {
    total_users,
    total_vendors_active,
    total_vendors_pending,
    total_products,
    total_reservations_today,
    total_revenue,
    weekly_reservations,
    recent_reservations,
    platform_completion_rate
  } = analytics

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Overview</h1>

      {/* Row 1: 6 stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-2 text-gray-500">
            <Users className="h-4 w-4 text-blue-500" /> <span className="text-sm font-medium">Total Users</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{total_users}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-200 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-2 text-gray-500">
            <Store className="h-4 w-4 text-green-500" /> <span className="text-sm font-medium">Active Vendors</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{total_vendors_active}</p>
        </div>
        <div className={`bg-white p-4 rounded-2xl border ${total_vendors_pending > 0 ? "border-amber-400 bg-amber-50/30" : "border-gray-200"} flex flex-col justify-center`}>
          <div className="flex items-center gap-2 mb-2 text-gray-500">
            <Clock className="h-4 w-4 text-amber-500" /> <span className="text-sm font-medium">Pending Approvals</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{total_vendors_pending}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-200 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-2 text-gray-500">
            <Package className="h-4 w-4 text-purple-500" /> <span className="text-sm font-medium">Total Products</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{total_products}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-200 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-2 text-gray-500">
            <ShoppingBag className="h-4 w-4 text-blue-500" /> <span className="text-sm font-medium">Reservations Today</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{total_reservations_today}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-200 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-2 text-gray-500">
            <IndianRupee className="h-4 w-4 text-green-500" /> <span className="text-sm font-medium">Total Revenue</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(total_revenue)}</p>
        </div>
      </div>

      {/* Row 2: Two cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-1">This Week</p>
            <p className="text-3xl font-bold text-blue-600">{weekly_reservations}</p>
            <p className="text-sm text-gray-500 mt-1">Total reservations across platform</p>
          </div>
          <ShoppingBag className="h-10 w-10 text-blue-100" />
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-1">Platform Completion Rate</p>
            <p className={`text-3xl font-bold ${getCompletionRateColor(platform_completion_rate)}`}>{platform_completion_rate}%</p>
            <p className="text-sm text-gray-500 mt-1">Confirmed vs Completed ratio</p>
          </div>
          <CheckCircle className={`h-10 w-10 ${platform_completion_rate >= 80 ? 'text-green-100' : 'text-amber-100'}`} />
        </div>
      </div>

      {/* Row 3: Recent Reservations */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-gray-200">
          <h2 className="font-bold text-gray-900">Recent Reservations</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 font-semibold">User</th>
                <th className="px-4 py-3 font-semibold">Product</th>
                <th className="px-4 py-3 font-semibold">Store</th>
                <th className="px-4 py-3 font-semibold">Amount (₹)</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Time Ago</th>
              </tr>
            </thead>
            <tbody>
              {recent_reservations?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">No reservations yet</td>
                </tr>
              ) : (
                recent_reservations?.map((res: any) => (
                  <tr key={res.reservation_id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium text-gray-900">{res.user_name}</td>
                    <td className="px-4 py-3 text-gray-600 truncate max-w-[150px]">{res.product_name}</td>
                    <td className="px-4 py-3 text-gray-600 truncate max-w-[150px]">{res.store_name}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{formatCurrency(res.total_value)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-md ${
                        res.status === 'completed' ? 'bg-green-100 text-green-800' :
                        res.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                        res.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                        res.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {res.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {formatDistanceToNow(new Date(res.created_at), { addSuffix: true })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="p-3 border-t border-gray-200 bg-gray-50 text-center">
          <button onClick={() => navigate("/users")} className="text-sm font-medium text-blue-600 hover:text-blue-800">
            View all users &rarr;
          </button>
        </div>
      </div>
    </div>
  )
}