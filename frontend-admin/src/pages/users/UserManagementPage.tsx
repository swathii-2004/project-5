import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Users, Search, Filter, ShieldAlert, Trash2, Power, PowerOff, Mail, Calendar } from "lucide-react"
import api from "../../lib/axios"
import { toast } from "sonner"
import { useState } from "react"
import { format } from "date-fns"

export default function UserManagementPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("")

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "users", page, search, roleFilter],
    queryFn: () => api.get("/admin/users", { 
      params: { 
        page, 
        search: search || undefined, 
        role: roleFilter || undefined 
      } 
    }).then((r) => r.data),
    keepPreviousData: true
  })

  const deactivateMutation = useMutation({
    mutationFn: (userId: string) => api.put(`/admin/users/${userId}/deactivate`),
    onSuccess: () => {
      toast.success("User deactivated")
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] })
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || "Action failed"),
  })

  const reactivateMutation = useMutation({
    mutationFn: (userId: string) => api.put(`/admin/users/${userId}/reactivate`),
    onSuccess: () => {
      toast.success("User reactivated")
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] })
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || "Action failed"),
  })

  const deleteMutation = useMutation({
    mutationFn: (userId: string) => api.delete(`/admin/users/${userId}`),
    onSuccess: () => {
      toast.success("User deleted permanently")
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] })
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || "Failed to delete"),
  })

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
  }

  if (isLoading && !data) {
    return <div className="p-8 text-center animate-pulse text-gray-500">Loading user database...</div>
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <Users className="h-7 w-7 text-blue-600" />
          User Management
        </h1>
        
        <div className="flex flex-wrap items-center gap-3">
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-64 bg-white"
            />
          </form>

          <select 
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value)
              setPage(1)
            }}
            className="px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">All Roles</option>
            <option value="user">Customers</option>
            <option value="vendor">Vendors</option>
          </select>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">User Details</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Joined</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data?.users?.map((u: any) => (
                <tr key={u.id} className="hover:bg-gray-50/50 transition">
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-900">{u.name}</div>
                    <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                      <Mail className="h-3 w-3" /> {u.email}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-md ${
                      u.role === 'vendor' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      u.status === 'active' ? 'bg-green-100 text-green-800' :
                      u.status === 'deactivated' ? 'bg-red-100 text-red-800' :
                      u.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs text-gray-500 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(u.created_at), "MMM d, yyyy")}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    {u.status === 'active' ? (
                      <button 
                        onClick={() => deactivateMutation.mutate(u.id)}
                        title="Deactivate User"
                        className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition"
                      >
                        <PowerOff className="h-4 w-4" />
                      </button>
                    ) : (
                      <button 
                        onClick={() => reactivateMutation.mutate(u.id)}
                        title="Reactivate User"
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
                      >
                        <Power className="h-4 w-4" />
                      </button>
                    )}
                    <button 
                      onClick={() => {
                        if (window.confirm("Are you sure you want to delete this user permanently? This cannot be undone.")) {
                          deleteMutation.mutate(u.id)
                        }
                      }}
                      title="Delete User"
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {data?.users?.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    <ShieldAlert className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                    No users found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {data?.pages > 1 && (
          <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-center gap-2">
            {Array.from({ length: data.pages }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-8 h-8 rounded-lg text-xs font-bold transition ${
                  page === p ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
