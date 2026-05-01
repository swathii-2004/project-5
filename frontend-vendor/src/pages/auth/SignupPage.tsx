import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Link, useNavigate } from "react-router-dom"
import { CheckCircle2 } from "lucide-react"
import api from "../../lib/axios"
import { toast } from "sonner"

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ACCEPTED_FILE_TYPES = ["application/pdf", "image/jpeg", "image/png"]

const signupSchema = z.object({
  name: z.string().min(2, "Owner name must be at least 2 characters"),
  store_name: z.string().min(2, "Store name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  phone: z.string().min(10, "Phone must be 10-15 digits").max(15, "Phone must be 10-15 digits"),
  gst_number: z.string().min(1, "GST number is required"),
  city: z.string().min(1, "City is required"),
})

type SignupForm = z.infer<typeof signupSchema>

export default function SignupPage() {
  const navigate = useNavigate()
  const [isSuccess, setIsSuccess] = useState(false)
  const [licenseFile, setLicenseFile] = useState<File | null>(null)
  const [idFile, setIdFile] = useState<File | null>(null)
  const [fileErrors, setFileErrors] = useState<{ license?: string; id?: string }>({})

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
  })

  const validateFile = (file: File) => {
    if (file.size > MAX_FILE_SIZE) return "File size must be less than 5MB"
    if (!ACCEPTED_FILE_TYPES.includes(file.type)) return "Only .pdf, .jpg, .png are allowed"
    return null
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: "license" | "id") => {
    const file = e.target.files?.[0]
    if (file) {
      const error = validateFile(file)
      if (error) {
        setFileErrors(prev => ({ ...prev, [type]: error }))
      } else {
        setFileErrors(prev => ({ ...prev, [type]: undefined }))
        if (type === "license") setLicenseFile(file)
        else setIdFile(file)
      }
    }
  }

  const onSubmit = async (data: SignupForm) => {
    if (!licenseFile || !idFile) {
      toast.error("Please upload both required documents")
      return
    }

    const formData = new FormData()
    Object.entries(data).forEach(([key, value]) => formData.append(key, value))
    formData.append("role", "vendor")
    formData.append("documents", licenseFile)
    formData.append("documents", idFile)

    try {
      await api.post("/auth/signup?role=vendor", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      })
      setIsSuccess(true)
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Signup failed")
    }
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg border border-gray-100 text-center">
          <div className="flex justify-center">
            <CheckCircle2 size={64} className="text-green-500" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">Application Submitted!</h2>
          <p className="mt-2 text-sm text-gray-600">
            Your documents are under review. You will receive an email once approved.
          </p>
          <button
            onClick={() => navigate("/login")}
            className="mt-6 w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Back to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl w-full space-y-8 bg-white p-8 rounded-xl shadow-lg border border-gray-100">
        <h2 className="text-center text-3xl font-extrabold text-gray-900">Register your store</h2>
        <form className="mt-8 space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Owner Name</label>
              <input {...register("name")} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm sm:text-sm" />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Store Name</label>
              <input {...register("store_name")} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm sm:text-sm" />
              {errors.store_name && <p className="text-red-500 text-xs mt-1">{errors.store_name.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input {...register("email")} type="email" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm sm:text-sm" />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Phone</label>
              <input {...register("phone")} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm sm:text-sm" />
              {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input {...register("password")} type="password" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm sm:text-sm" />
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">GST Number</label>
              <input {...register("gst_number")} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm sm:text-sm" />
              {errors.gst_number && <p className="text-red-500 text-xs mt-1">{errors.gst_number.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">City</label>
              <input {...register("city")} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm sm:text-sm" />
              {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city.message}</p>}
            </div>
          </div>

          <div className="space-y-4 border-t pt-4">
            <h3 className="text-lg font-medium text-gray-900">Documents</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700">Trade License</label>
              <input type="file" onChange={(e) => handleFileChange(e, "license")} className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
              {fileErrors.license && <p className="text-red-500 text-xs mt-1">{fileErrors.license}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">ID Proof</label>
              <input type="file" onChange={(e) => handleFileChange(e, "id")} className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
              {fileErrors.id && <p className="text-red-500 text-xs mt-1">{fileErrors.id}</p>}
            </div>
          </div>

          <button type="submit" disabled={isSubmitting} className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50">
            {isSubmitting ? "Submitting Application..." : "Register Store"}
          </button>
        </form>
        <div className="text-center">
          <Link to="/login" className="text-sm text-indigo-600 hover:text-indigo-500">Already have an account? Log in</Link>
        </div>
      </div>
    </div>
  )
}
