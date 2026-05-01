import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/auth/LoginPage'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<div>Admin Dashboard — Coming Soon</div>} />
        <Route path="/approvals" element={<div>Approvals — Coming Soon</div>} />
        <Route path="/users" element={<div>Users — Coming Soon</div>} />
        <Route path="/analytics" element={<div>Analytics — Coming Soon</div>} />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default App