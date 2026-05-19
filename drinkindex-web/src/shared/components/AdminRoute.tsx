import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/domain/auth/store/authStore'

export default function AdminRoute() {
  const user = useAuthStore((s) => s.user)
  if (!user) return <Navigate to="/login" replace />
  if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') return <Outlet />
  if (user.role === 'PARTNER' && user.allowedMenus && user.allowedMenus.length > 0)
    return <Outlet />
  return <Navigate to="/" replace />
}
