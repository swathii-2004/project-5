import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";

function DashboardPlaceholder() { return <div>Dashboard - coming soon</div>; }

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route path="/signup" element={<div>Signup Page</div>} />
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPlaceholder />} />
          <Route path="/search" element={<div>Search</div>} />
          <Route path="/map" element={<div>Map</div>} />
          <Route path="/reservations" element={<div>Reservations</div>} />
          <Route path="/chat" element={<div>Chat</div>} />
          <Route path="/wishlist" element={<div>Wishlist</div>} />
          <Route path="/emergency" element={<div>Emergency</div>} />
        </Route>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
