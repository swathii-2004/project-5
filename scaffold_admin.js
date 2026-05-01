const fs = require('fs');
const path = require('path');

const adminDir = path.join(__dirname, 'frontend-admin');

const files = {
  'src/components/layout/AdminLayout.tsx': `import { Outlet } from "react-router-dom";
export default function AdminLayout() { return <div className="admin-layout">Sidebar<main><Outlet/></main></div>; }`,
  'src/pages/dashboard/DashboardPage.tsx': `export default function DashboardPage() { return <div>Dashboard</div>; }`,
  'src/pages/approvals/PendingApprovalsPage.tsx': `export default function PendingApprovalsPage() { return <div>Approvals</div>; }`,
  'src/pages/users/UsersPage.tsx': `export default function UsersPage() { return <div>Users</div>; }`,
  'src/pages/analytics/AnalyticsPage.tsx': `export default function AnalyticsPage() { return <div>Analytics</div>; }`,
  'src/App.tsx': `import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AdminLayout from "./components/layout/AdminLayout";
import DashboardPage from "./pages/dashboard/DashboardPage";
import PendingApprovalsPage from "./pages/approvals/PendingApprovalsPage";
import UsersPage from "./pages/users/UsersPage";
import AnalyticsPage from "./pages/analytics/AnalyticsPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<div>Admin Login</div>} />
        <Route element={<AdminLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/approvals" element={<PendingApprovalsPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
        </Route>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}`
};

Object.entries(files).forEach(([file, content]) => {
  const fullPath = path.join(adminDir, file);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content);
});
