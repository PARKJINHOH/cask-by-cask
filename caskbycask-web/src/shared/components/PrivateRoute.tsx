import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/domain/auth/store/authStore'
import RouteFallback from '@/shared/components/RouteFallback'

export default function PrivateRoute() {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)
  const isAuthReady = useAuthStore((s) => s.isAuthReady)
  const location   = useLocation()

  if (!isAuthReady) return <RouteFallback />

  return isLoggedIn
    ? <Outlet />
    : <Navigate to="/login" state={{ from: location }} replace />
}
