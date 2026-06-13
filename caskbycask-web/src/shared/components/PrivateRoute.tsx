import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/domain/auth/store/authStore'

export default function PrivateRoute() {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)
  const location   = useLocation()
  return isLoggedIn
    ? <Outlet />
    : <Navigate to="/login" state={{ from: location }} replace />
}
