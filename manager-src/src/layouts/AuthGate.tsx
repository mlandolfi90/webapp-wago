import { Navigate, Outlet } from 'react-router-dom'
import { getApiKey } from '@/lib/api/client'

export function AuthGate() {
  const key = getApiKey()
  if (!key) return <Navigate to="/login" replace />
  return <Outlet />
}
