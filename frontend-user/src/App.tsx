import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import UserLayout from './components/layout/UserLayout'
import LoginPage from './pages/auth/LoginPage'
import SignupPage from './pages/auth/SignupPage'
import UserDashboardPage from './pages/dashboard/UserDashboardPage'
import SearchPage from './pages/search/SearchPage'
import ProductDetailPage from './pages/search/ProductDetailPage'
import StorePage from './pages/search/StorePage'
import WishlistPage from './pages/wishlist/WishlistPage'
import ReservationsPage from './pages/reservations/ReservationsPage'
import MapPage from './pages/map/MapPage'
import EmergencyPage from './pages/emergency/EmergencyPage'
import ChatPage from './pages/chat/ChatPage'
import NotificationsPage from './pages/notifications/NotificationsPage'

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
          <Route path="/stores/:store_id" element={<StorePage />} />
          <Route path="/wishlist" element={<WishlistPage />} />
          <Route path="/reservations" element={<ReservationsPage />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/emergency" element={<EmergencyPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default App


