import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts"
import { format, parseISO } from "date-fns"
import api from "../../lib/axios"

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<"week" | "month">("week")

  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ["vendor", "analytics"],
    queryFn: () => api.get("/vendors/me/analytics").then((r) => r.data),
  })

  const { data: chartData, isLoading: chartLoading } = useQuery({
    queryKey: ["vendor", "analytics", "chart", period],
    queryFn: () => api.get("/vendors/me/analytics/chart", { params: { period } }).then((r) => r.data),
  })

  if (analyticsLoading || chartLoading) {
    return <div className="p-8 text-center animate-pulse">Loading analytics...</div>
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(val)
  }

  // Format date for X axis (e.g. "Apr 1")
  const formattedChartData = chartData?.map((item: any) => ({
    ...item,
    formattedDate: format(parseISO(item.date), "MMM d")
  })) || []

  // Top products format
  const topProducts = analytics?.top_5_products.map((item: any) => ({
    name: item.product_name.length > 15 ? item.product_name.substring(0, 15) + "..." : item.product_name,
    quantity: item.total_quantity
  })) || []

  // Peak hours format
  const peakHours = analytics?.peak_hours.map((item: any) => ({
    hourLabel: item.hour === 0 ? "12 AM" : item.hour < 12 ? `${item.hour} AM` : item.hour === 12 ? "12 PM" : `${item.hour - 12} PM`,
    count: item.count
  })) || []

  const maxPeakCount = Math.max(...peakHours.map((h: any) => h.count), 0)
  const busiestHour = peakHours.find((h: any) => h.count === maxPeakCount)

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <div className="flex bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setPeriod("week")}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition ${period === "week" ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
          >
            This Week
          </button>
          <button
            onClick={() => setPeriod("month")}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition ${period === "month" ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
          >
            This Month
          </button>
        </div>
      </div>

      {/* Chart 1: Reservation Trend */}
      <div className="bg-white p-6 border border-gray-200 rounded-2xl shadow-sm">
        <h2 className="text-lg font-bold text-gray-900 mb-6">Reservation Trend</h2>
        <div className="h-[300px]">
          {formattedChartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-400 italic">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={formattedChartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="formattedDate" tick={{fontSize: 12}} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tick={{fontSize: 12}} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                <Legend iconType="circle" />
                <Line type="monotone" dataKey="reservations" name="Total Reservations" stroke="#3b82f6" strokeWidth={3} dot={{r: 4, strokeWidth: 2}} activeDot={{r: 6}} />
                <Line type="monotone" dataKey="completed" name="Completed" stroke="#22c55e" strokeWidth={3} dot={{r: 4, strokeWidth: 2}} activeDot={{r: 6}} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 2: Top Products */}
        <div className="bg-white p-6 border border-gray-200 rounded-2xl shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-6">Top Reserved Products</h2>
          <div className="h-[250px]">
            {topProducts.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-400 italic">No data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProducts} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="name" tick={{fontSize: 11}} tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tick={{fontSize: 12}} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{fill: '#f3f4f6'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                  <Bar dataKey="quantity" name="Quantity" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 3: Peak Hours */}
        <div className="bg-white p-6 border border-gray-200 rounded-2xl shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-6">Peak Booking Hours</h2>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={peakHours} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="hourLabel" tick={{fontSize: 10}} tickLine={false} axisLine={false} interval={3} />
                <YAxis allowDecimals={false} tick={{fontSize: 12}} tickLine={false} axisLine={false} />
                <Tooltip cursor={{fill: '#f3f4f6'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                <Bar dataKey="count" name="Reservations">
                  {peakHours.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.count === maxPeakCount && maxPeakCount > 0 ? '#b45309' : '#f59e0b'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Stat Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-xs font-bold text-gray-500 uppercase">Completion Rate</p>
          <p className={`text-2xl font-bold mt-1 ${analytics?.completion_rate >= 80 ? 'text-green-600' : analytics?.completion_rate >= 50 ? 'text-amber-500' : 'text-red-600'}`}>
            {analytics?.completion_rate}%
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-xs font-bold text-gray-500 uppercase">Total Revenue</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(analytics?.revenue_this_month)}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-xs font-bold text-gray-500 uppercase">Top Product</p>
          <p className="text-xl font-bold text-gray-900 mt-1 truncate">
            {topProducts[0]?.name || "N/A"}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-xs font-bold text-gray-500 uppercase">Peak Hour</p>
          <p className="text-lg font-bold text-gray-900 mt-1 truncate">
            {maxPeakCount > 0 ? `Most busy at ${busiestHour?.hourLabel}` : "N/A"}
          </p>
        </div>
      </div>
    </div>
  )
}
