import { Outlet } from "react-router-dom";
export default function AdminLayout() { return <div className="admin-layout">Sidebar<main><Outlet/></main></div>; }