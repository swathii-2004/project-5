import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/auth/LoginPage'
import SignupPage from './pages/auth/SignupPage'

import DashboardPage from './pages/dashboard/DashboardPage'
import ProductsPage from './pages/products/ProductsPage'
import InventoryPage from './pages/inventory/InventoryPage'
import VendorReservationsPage from './pages/reservations/VendorReservationsPage'
import VendorLayout from './components/layout/VendorLayout'
import ChatPage from './pages/chat/ChatPage'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      
      <Route element={<ProtectedRoute />}>
        <Route element={<VendorLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/reservations" element={<VendorReservationsPage />} />
          <Route path="/analytics" element={<div>Analytics — Coming Soon</div>} />
          <Route path="/chat" element={<ChatPage />} />
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default App

