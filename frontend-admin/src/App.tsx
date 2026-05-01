import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";

function DashboardPlaceholder() { return <div>Admin Dashboard - coming soon</div>; }

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<div>Admin Login</div>} />
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPlaceholder />} />
          <Route path="/approvals" element={<div>Approvals</div>} />
          <Route path="/users" element={<div>Users</div>} />
          <Route path="/analytics" element={<div>Analytics</div>} />
        </Route>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
