import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/domain/auth/store/authStore'
import RouteFallback from '@/shared/components/RouteFallback'

export default function AdminRoute() {
  const user = useAuthStore((s) => s.user)
  const isAuthReady = useAuthStore((s) => s.isAuthReady)
  if (!isAuthReady) return <RouteFallback />
  if (!user) return <Navigate to="/login" replace />
  if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') return <Outlet />
  // 비관리자 역할(파트너/증류소 관계자/수입사 등)은 허용 메뉴가 하나라도 있으면 콘솔 접근 허용
  if (user.allowedMenus && user.allowedMenus.length > 0) return <Outlet />
  return <Navigate to="/" replace />
}
