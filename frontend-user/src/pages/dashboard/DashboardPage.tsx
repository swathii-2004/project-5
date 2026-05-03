import { useQuery } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import { Search, Map, AlertTriangle, Heart, ShoppingBag, CheckCircle, Package } from "lucide-react"
import api from "../../lib/axios"
import { useAuthStore } from "../../store/authStore"
import { useLocationStore } from "../../store/locationStore"

export default function DashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { latitude, longitude } = useLocationStore()

  const { data: dashboard, isLoading: dashLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api.get("/users/me/dashboard").then((r) => r.data),
  })

  const { data: recommended, isLoading: recLoading } = useQuery({
    queryKey: ["recommended", latitude, longitude],
    queryFn: () =>
      api.get("/products/recommended", {
        params: { lat: latitude, lng: longitude, limit: 5 },
      }).then((r) => r.data),
    enabled: !!latitude && !!longitude,
  })

  const formatCountdown = (seconds: number) => {
    if (!seconds || seconds <= 0) return "00:00"
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, "0")}`
  }

  if (dashLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-8 animate-pulse p-4">
        <div className="h-20 bg-gray-200 rounded-2xl w-3/4"></div>
        <div className="flex gap-4">
          <div className="h-16 bg-gray-200 rounded-xl flex-1"></div>
          <div className="h-16 bg-gray-200 rounded-xl flex-1"></div>
          <div className="h-16 bg-gray-200 rounded-xl flex-1"></div>
          <div className="h-16 bg-gray-200 rounded-xl flex-1"></div>
        </div>
        <div className="h-40 bg-gray-200 rounded-2xl w-full"></div>
      </div>
    )
  }

  const { stats, active_reservations, wishlist_alerts, nearby_stores_preview } = dashboard

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Section 1: Welcome */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Welcome back, {user?.name}!</h1>
        <p className="text-gray-500 mt-1">Here's what's happening near you</p>
      </div>

      {/* Section 2: Quick nav */}
      <div className="grid grid-cols-4 gap-2 md:gap-4">
        <button onClick={() => navigate("/search")} className="flex flex-col items-center justify-center p-3 md:p-4 border border-gray-200 rounded-2xl hover:bg-gray-50 transition">
          <Search className="h-6 w-6 text-blue-600 mb-2" />
          <span className="text-xs md:text-sm font-medium text-gray-700">Find Products</span>
        </button>
        <button onClick={() => navigate("/map")} className="flex flex-col items-center justify-center p-3 md:p-4 border border-gray-200 rounded-2xl hover:bg-gray-50 transition">
          <Map className="h-6 w-6 text-green-600 mb-2" />
          <span className="text-xs md:text-sm font-medium text-gray-700">Nearby Map</span>
        </button>
        <button onClick={() => navigate("/emergency")} className="flex flex-col items-center justify-center p-3 md:p-4 border border-red-200 bg-red-50 rounded-2xl hover:bg-red-100 transition">
          <AlertTriangle className="h-6 w-6 text-red-600 mb-2" />
          <span className="text-xs md:text-sm font-medium text-red-700">Emergency</span>
        </button>
        <button onClick={() => navigate("/wishlist")} className="flex flex-col items-center justify-center p-3 md:p-4 border border-gray-200 rounded-2xl hover:bg-gray-50 transition">
          <Heart className="h-6 w-6 text-pink-500 mb-2" />
          <span className="text-xs md:text-sm font-medium text-gray-700">Wishlist</span>
        </button>
      </div>

      {/* Section 3: Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><ShoppingBag className="h-6 w-6" /></div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{stats.total_reservations}</p>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-200 flex items-center gap-4">
          <div className="p-3 bg-green-50 text-green-600 rounded-xl"><CheckCircle className="h-6 w-6" /></div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{stats.completed_reservations}</p>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Pickups</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-200 flex items-center gap-4">
          <div className="p-3 bg-pink-50 text-pink-600 rounded-xl"><Heart className="h-6 w-6" /></div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{stats.active_wishlist_items}</p>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Wishlist</p>
          </div>
        </div>
      </div>

      {/* Section 4: Active Reservations */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Active Reservations</h2>
          <button onClick={() => navigate("/reservations")} className="text-sm font-medium text-blue-600 hover:text-blue-800">
            View all &rarr;
          </button>
        </div>
        
        {active_reservations.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-8 text-center flex flex-col items-center">
            <ShoppingBag className="h-10 w-10 text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium mb-4">No active reservations</p>
            <button onClick={() => navigate("/search")} className="px-5 py-2 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition">
              Browse products
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {active_reservations.map((res: any) => (
              <div key={res.id} className="bg-white border border-gray-200 p-4 rounded-2xl shadow-sm hover:shadow-md transition">
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-md ${
                    res.status === 'confirmed' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {res.status}
                  </span>
                  <span className="text-xs font-mono font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded-md">
                    {formatCountdown(res.countdown_seconds)}
                  </span>
                </div>
                <h3 className="font-bold text-gray-900 truncate mb-1">{res.items[0]?.name}</h3>
                <p className="text-sm text-gray-500 mb-4">Qty: {res.items[0]?.quantity}</p>
                <button onClick={() => navigate("/reservations")} className="w-full py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl text-sm font-medium transition">
                  View Details
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 5: Wishlist Alerts */}
      {wishlist_alerts.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Price & Stock Alerts</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {wishlist_alerts.map((alert: any) => (
              <div key={alert.product_id} className="bg-white border border-blue-100 p-4 rounded-2xl flex items-center gap-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-blue-50 rounded-bl-full -z-10"></div>
                <img src={alert.images[0] || "https://placehold.co/100"} className="w-12 h-12 rounded-lg object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-green-600 mb-0.5">
                    {alert.price_drop ? "Price dropped!" : "Back in stock!"}
                  </p>
                  <p className="text-sm font-bold text-gray-900 truncate">{alert.name}</p>
                  <p className="text-xs text-gray-600 mt-0.5 font-medium">₹{alert.current_price}</p>
                </div>
                <button onClick={() => navigate(`/products/${alert.product_id}`)} className="text-sm text-blue-600 font-bold bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition">
                  Go
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 6: Nearby Stores */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Stores Near You</h2>
          <button onClick={() => navigate("/map")} className="text-sm font-medium text-blue-600 hover:text-blue-800">
            See all on map &rarr;
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {nearby_stores_preview.map((store: any) => (
            <div key={store.store_id} className="bg-white p-4 rounded-2xl border border-gray-200">
              <h3 className="font-bold text-gray-900 truncate">{store.store_name}</h3>
              <p className="text-sm text-gray-500 mb-3">{store.city}</p>
              <div className="flex justify-between items-center mt-auto">
                <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-md">★ {store.average_rating.toFixed(1)}</span>
                <button onClick={() => navigate(`/stores/${store.store_id}`)} className="text-xs font-medium text-blue-600 hover:underline">
                  View products
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 7: Recommendations */}
      {latitude && longitude && (
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Popular Near You</h2>
          {recLoading ? (
            <div className="flex gap-4 overflow-hidden">
              {[1,2,3,4].map(i => <div key={i} className="w-40 h-48 bg-gray-200 rounded-2xl shrink-0 animate-pulse" />)}
            </div>
          ) : recommended?.length > 0 ? (
            <div className="flex gap-4 overflow-x-auto pb-4 snap-x">
              {recommended.map((prod: any) => (
                <div key={prod.id} className="w-40 shrink-0 bg-white border border-gray-200 rounded-2xl p-3 snap-start hover:shadow-md transition cursor-pointer" onClick={() => navigate(`/products/${prod.id}`)}>
                  <img src={prod.images[0] || "https://placehold.co/200"} className="w-full h-32 object-cover rounded-xl mb-3" />
                  <p className="font-bold text-gray-900 text-sm truncate mb-1">{prod.name}</p>
                  <p className="text-sm font-bold text-blue-600">₹{prod.price}</p>
                </div>
              ))}
            </div>
          ) : (
             <div className="text-gray-500 text-sm italic">No recommendations available yet.</div>
          )}
        </div>
      )}
    </div>
  )
}
