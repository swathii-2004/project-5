import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import UserLayout from './components/layout/UserLayout'
import LoginPage from './pages/auth/LoginPage'
import SignupPage from './pages/auth/SignupPage'
import UserDashboardPage from './pages/dashboard/UserDashboardPage'
import SearchPage from './pages/search/SearchPage'
import ProductDetailPage from './pages/search/ProductDetailPage'
import WishlistPage from './pages/wishlist/WishlistPage'
import ReservationsPage from './pages/reservations/ReservationsPage'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<UserLayout />}>
          <Route path="/dashboard" element={<UserDashboardPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/products/:id" element={<ProductDetailPage />} />
          <Route path="/wishlist" element={<WishlistPage />} />
          <Route path="/reservations" element={<ReservationsPage />} />
          <Route path="/map" element={<div className="py-20 text-center text-gray-400">Map — Coming Soon</div>} />
          <Route path="/chat" element={<div className="py-20 text-center text-gray-400">Chat — Coming Soon</div>} />
          <Route path="/emergency" element={<div className="py-20 text-center text-gray-400">Emergency — Coming Soon</div>} />
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default App

