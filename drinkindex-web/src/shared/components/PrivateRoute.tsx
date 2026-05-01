import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/domain/auth/store/authStore'

export default function PrivateRoute() {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)
  return isLoggedIn ? <Outlet /> : <Navigate to="/login" replace />
}
