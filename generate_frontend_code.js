const fs = require('fs');
const path = require('path');

const apps = ['frontend-user', 'frontend-vendor', 'frontend-admin'];

const axiosTs = `import axios from "axios";
import { useAuthStore } from "../store/authStore";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = \`Bearer \${token}\`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && originalRequest.url !== "/auth/refresh") {
      try {
        const res = await axios.post(
          \`\${import.meta.env.VITE_API_URL}/auth/refresh\`,
          {},
          { withCredentials: true }
        );
        const { access_token } = res.data;
        useAuthStore.getState().setAuth(useAuthStore.getState().user, access_token);
        originalRequest.headers.Authorization = \`Bearer \${access_token}\`;
        return api(originalRequest);
      } catch (refreshError) {
        useAuthStore.getState().logout();
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
`;

const authStoreTs = `import { create } from "zustand";

interface User { id: string; name: string; email: string; role: string; status: string }
interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  setAuth: (user, token) => set({ user, token, isAuthenticated: true }),
  logout: () => set({ user: null, token: null, isAuthenticated: false }),
}));
`;

const protectedRouteTsx = `import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

export function ProtectedRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Outlet />;
}
`;

const userAppTsx = `import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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
`;

const vendorAppTsx = `import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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
`;

const adminAppTsx = `import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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
`;

apps.forEach(app => {
  const libDir = path.join(__dirname, app, 'src', 'lib');
  const storeDir = path.join(__dirname, app, 'src', 'store');
  const componentsDir = path.join(__dirname, app, 'src', 'components');
  
  fs.mkdirSync(libDir, { recursive: true });
  fs.mkdirSync(storeDir, { recursive: true });
  fs.mkdirSync(componentsDir, { recursive: true });
  
  fs.writeFileSync(path.join(libDir, 'axios.ts'), axiosTs);
  fs.writeFileSync(path.join(storeDir, 'authStore.ts'), authStoreTs);
  fs.writeFileSync(path.join(componentsDir, 'ProtectedRoute.tsx'), protectedRouteTsx);
  
  if (app === 'frontend-user') {
    fs.writeFileSync(path.join(__dirname, app, 'src', 'App.tsx'), userAppTsx);
  } else if (app === 'frontend-vendor') {
    fs.writeFileSync(path.join(__dirname, app, 'src', 'App.tsx'), vendorAppTsx);
  } else if (app === 'frontend-admin') {
    fs.writeFileSync(path.join(__dirname, app, 'src', 'App.tsx'), adminAppTsx);
  }
});
