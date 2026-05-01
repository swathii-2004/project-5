import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";

function DashboardPlaceholder() { return <div>Vendor Dashboard - coming soon</div>; }

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<div>Vendor Login</div>} />
        <Route path="/signup" element={<div>Vendor Signup</div>} />
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPlaceholder />} />
          <Route path="/products" element={<div>Products</div>} />
          <Route path="/reservations" element={<div>Reservations</div>} />
          <Route path="/inventory" element={<div>Inventory</div>} />
          <Route path="/analytics" element={<div>Analytics</div>} />
          <Route path="/chat" element={<div>Chat</div>} />
        </Route>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
