import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import { Calendar, Clock, CheckCircle, TrendingUp, ArrowRight, Package } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import api from "../../lib/axios"

export default function DashboardPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: analytics, isLoading } = useQuery({
    queryKey: ["vendor", "analytics"],
    queryFn: () => api.get("/vendors/me/analytics").then((r) => r.data),
  })

  const { data: pendingReservations, isLoading: pendingLoading } = useQuery({
    queryKey: ["vendor", "reservations", "pending", "limit"],
    queryFn: () => api.get("/reservations/vendor", { params: { status: "pending", limit: 3 } }).then((r) => r.data),
  })

  const confirmMutation = useMutation({
    mutationFn: (id: string) => api.put(`/reservations/${id}/confirm`),
    onSuccess: () => {
      queryClient.invalidateQueries(["vendor", "reservations"])
      queryClient.invalidateQueries(["vendor", "analytics"])
    }
  })

  const rejectMutation = useMutation({
    mutationFn: (id: string) => api.put(`/reservations/${id}/reject`, { reason: "Vendor rejected" }),
    onSuccess: () => {
      queryClient.invalidateQueries(["vendor", "reservations"])
      queryClient.invalidateQueries(["vendor", "analytics"])
    }
  })

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-24 bg-gray-200 rounded-2xl" />)}
        </div>
        <div className="h-32 bg-gray-200 rounded-2xl w-full" />
        <div className="h-40 bg-gray-200 rounded-2xl w-full" />
      </div>
    )
  }

  const {
    today_reservations,
    pending_count,
    completed_count,
    completion_rate,
    revenue_this_month,
    low_stock_products
  } = analytics

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(val)
  }

  const getCompletionRateColor = (rate: number) => {
    if (rate >= 80) return "text-green-600"
    if (rate >= 50) return "text-amber-500"
    return "text-red-600"
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Row 1: Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-2 text-gray-500">
            <Calendar className="h-4 w-4 text-blue-500" /> <span className="text-sm font-medium">Today</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{today_reservations}</p>
        </div>
        <div className={`bg-white p-4 rounded-2xl border ${pending_count > 0 ? "border-amber-400 bg-amber-50/30" : "border-gray-200"} flex flex-col justify-center`}>
          <div className="flex items-center gap-2 mb-2 text-gray-500">
            <Clock className="h-4 w-4 text-amber-500" /> <span className="text-sm font-medium">Pending</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{pending_count}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-200 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-2 text-gray-500">
            <CheckCircle className="h-4 w-4 text-green-500" /> <span className="text-sm font-medium">Completed (Mo)</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{completed_count}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-200 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-2 text-gray-500">
            <TrendingUp className={`h-4 w-4 ${getCompletionRateColor(completion_rate)}`} /> 
            <span className="text-sm font-medium">Completion Rate</span>
          </div>
          <p className={`text-2xl font-bold ${getCompletionRateColor(completion_rate)}`}>{completion_rate}%</p>
        </div>
      </div>

      {/* Row 2: Revenue */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 flex items-center justify-between shadow-sm">
        <div>
          <p className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-1">This Month's Revenue</p>
          <p className="text-4xl font-bold text-gray-900">{formatCurrency(revenue_this_month)}</p>
          <p className="text-sm text-gray-500 mt-2">Based on completed reservations</p>
        </div>
        <div className="h-16 w-16 bg-green-50 rounded-full flex items-center justify-center">
          <TrendingUp className="h-8 w-8 text-green-600" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Row 3: Low Stock Alerts */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Package className="h-5 w-5" /> Needs Attention
            </h2>
            <button onClick={() => navigate("/inventory")} className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1">
              Go to Inventory <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          
          <div className="flex-1">
            {low_stock_products.length === 0 ? (
              <div className="h-full flex items-center justify-center min-h-[150px]">
                <p className="text-green-600 font-medium">All products well stocked ✓</p>
              </div>
            ) : (
              <div className="space-y-3">
                {low_stock_products.slice(0, 5).map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between p-3 border border-gray-100 bg-gray-50 rounded-xl">
                    <div>
                      <p className="font-bold text-gray-900 text-sm truncate max-w-[200px]">{item.name}</p>
                      <p className="text-xs font-medium text-amber-600 mt-0.5">
                        {item.available_qty} available (threshold: {item.low_stock_threshold})
                      </p>
                    </div>
                    <button onClick={() => navigate("/inventory")} className="px-3 py-1.5 text-xs font-bold text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition">
                      Update Stock
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Row 4: Pending Reservations */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Clock className="h-5 w-5" /> Pending Requests
            </h2>
            <button onClick={() => navigate("/reservations")} className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1">
              View all <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1">
            {pendingLoading ? (
              <div className="space-y-3"><div className="h-16 bg-gray-100 rounded-xl animate-pulse" /></div>
            ) : !pendingReservations || pendingReservations.length === 0 ? (
              <div className="h-full flex items-center justify-center min-h-[150px]">
                <p className="text-gray-400 font-medium italic">No pending requests</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingReservations.map((res: any) => (
                  <div key={res.id} className="p-3 border border-amber-100 bg-amber-50/30 rounded-xl">
                    <div className="flex justify-between items-start mb-2">
                      <div className="pr-4">
                        <p className="font-bold text-gray-900 text-sm truncate">{res.items[0]?.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">Qty: {res.items[0]?.quantity}</p>
                      </div>
                      <p className="text-[10px] text-gray-400 shrink-0 whitespace-nowrap">
                        {formatDistanceToNow(new Date(res.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => confirmMutation.mutate(res.id)}
                        disabled={confirmMutation.isPending}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-1.5 rounded-lg transition disabled:opacity-50"
                      >
                        Confirm
                      </button>
                      <button 
                        onClick={() => rejectMutation.mutate(res.id)}
                        disabled={rejectMutation.isPending}
                        className="flex-1 bg-white hover:bg-gray-50 border border-gray-200 text-red-600 text-xs font-bold py-1.5 rounded-lg transition disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
