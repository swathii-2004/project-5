import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Clock, CheckCircle2, XCircle, FileText, ExternalLink, AlertCircle } from "lucide-react"
import api from "../../lib/axios"
import { toast } from "sonner"
import { useState } from "react"

export default function PendingApprovalsPage() {
  const queryClient = useQueryClient()
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [reason, setReason] = useState("")

  const { data: pending, isLoading } = useQuery({
    queryKey: ["admin", "pending"],
    queryFn: () => api.get("/admin/pending").then((r) => r.data),
  })

  const approveMutation = useMutation({
    mutationFn: (userId: string) => api.put(`/admin/approve/${userId}`),
    onSuccess: () => {
      toast.success("Vendor approved successfully")
      queryClient.invalidateQueries({ queryKey: ["admin", "pending"] })
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || "Failed to approve"),
  })

  const rejectMutation = useMutation({
    mutationFn: (userId: string) => api.put(`/admin/reject/${userId}`, { reason }),
    onSuccess: () => {
      toast.success("Vendor rejected")
      setRejectingId(null)
      setReason("")
      queryClient.invalidateQueries({ queryKey: ["admin", "pending"] })
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || "Failed to reject"),
  })

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-48 mb-6" />
        {[1, 2, 3].map(i => (
          <div key={i} className="h-40 bg-gray-200 rounded-2xl" />
        ))}
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Vendor Approvals</h1>
        <div className="px-3 py-1 bg-amber-100 text-amber-700 text-sm font-bold rounded-full">
          {pending?.length || 0} Pending
        </div>
      </div>

      {pending?.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center">
          <CheckCircle2 className="h-12 w-12 text-green-200 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">All caught up! No pending applications.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {pending?.map((item: any) => (
            <div key={item.user_id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition">
              <div className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-lg font-bold text-gray-900">{item.store_name}</h2>
                      <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded font-medium">ID: {item.user_id.slice(-6)}</span>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p className="flex items-center gap-2"><span className="font-semibold">Contact:</span> {item.name} ({item.email})</p>
                      <p className="flex items-center gap-2"><span className="font-semibold">Location:</span> {item.city}</p>
                      <p className="flex items-center gap-2 text-amber-600 font-medium">
                        <Clock className="h-4 w-4" /> Waiting for {Math.floor(item.hours_waiting)} hours
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => approveMutation.mutate(item.user_id)}
                      className="px-4 py-2 bg-green-600 text-white rounded-xl font-bold text-sm hover:bg-green-700 transition flex items-center gap-2"
                    >
                      <CheckCircle2 className="h-4 w-4" /> Approve
                    </button>
                    <button
                      onClick={() => setRejectingId(item.user_id)}
                      className="px-4 py-2 border border-red-200 text-red-600 rounded-xl font-bold text-sm hover:bg-red-50 transition flex items-center gap-2"
                    >
                      <XCircle className="h-4 w-4" /> Reject
                    </button>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-100">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Verification Documents</p>
                  <div className="flex flex-wrap gap-3">
                    {item.doc_urls?.length > 0 ? item.doc_urls.map((url: string, idx: number) => (
                      <a 
                        key={idx} 
                        href={url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 transition"
                      >
                        <FileText className="h-4 w-4 text-slate-400" />
                        Document {idx + 1}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )) : (
                      <p className="text-xs text-amber-600 italic flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> No documents uploaded
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {rejectingId === item.user_id && (
                <div className="bg-red-50 p-6 border-t border-red-100">
                  <label className="block text-sm font-bold text-red-900 mb-2">Rejection Reason</label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Documents are unclear / Invalid business license..."
                    className="w-full rounded-xl border-red-200 border bg-white p-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 mb-4"
                    rows={3}
                  />
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => setRejectingId(null)}
                      className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700"
                    >
                      Cancel
                    </button>
                    <button
                      disabled={!reason.trim() || rejectMutation.isLoading}
                      onClick={() => rejectMutation.mutate(item.user_id)}
                      className="px-6 py-2 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 disabled:opacity-50 transition"
                    >
                      {rejectMutation.isLoading ? "Rejecting..." : "Confirm Rejection"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}