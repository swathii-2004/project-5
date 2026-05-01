import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/auth/LoginPage'
import SignupPage from './pages/auth/SignupPage'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<div>User Dashboard — Coming Soon</div>} />
        <Route path="/search" element={<div>Search — Coming Soon</div>} />
        <Route path="/map" element={<div>Map — Coming Soon</div>} />
        <Route path="/reservations" element={<div>Reservations — Coming Soon</div>} />
        <Route path="/chat" element={<div>Chat — Coming Soon</div>} />
        <Route path="/wishlist" element={<div>Wishlist — Coming Soon</div>} />
        <Route path="/emergency" element={<div>Emergency — Coming Soon</div>} />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default App
