import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'
import { AuthGate } from '@/layouts/AuthGate'
import { Shell } from '@/layouts/Shell'

// Lazy-loaded pages: cada una sale a su propio chunk vía Vite/Rollup.
// El main chunk queda solo con login + shell + router + libs core
// (React, Radix base, TanStack Query). Reduce el TTI inicial.
const Login = lazy(() =>
  import('@/pages/Login').then((m) => ({ default: m.Login })),
)
const Dashboard = lazy(() =>
  import('@/pages/Dashboard').then((m) => ({ default: m.Dashboard })),
)
const Instances = lazy(() =>
  import('@/pages/Instances').then((m) => ({ default: m.Instances })),
)
const InstanceConfig = lazy(() =>
  import('@/pages/InstanceConfig').then((m) => ({ default: m.InstanceConfig })),
)
const NotFound = lazy(() =>
  import('@/pages/NotFound').then((m) => ({ default: m.NotFound })),
)

function PageFallback() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[40vh] items-center justify-center"
    >
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent" />
    </div>
  )
}

function lazyPage(Component: React.ComponentType) {
  return (
    <Suspense fallback={<PageFallback />}>
      <Component />
    </Suspense>
  )
}

const router = createBrowserRouter(
  [
    { path: '/login', element: lazyPage(Login) },
    {
      element: <AuthGate />,
      children: [
        {
          element: <Shell />,
          children: [
            { path: '/', element: <Navigate to="/dashboard" replace /> },
            { path: '/dashboard', element: lazyPage(Dashboard) },
            { path: '/instances', element: lazyPage(Instances) },
            { path: '/instances/:instanceId', element: lazyPage(InstanceConfig) },
          ],
        },
      ],
    },
    { path: '*', element: lazyPage(NotFound) },
  ],
  { basename: '/manager' },
)

export function AppRouter() {
  return <RouterProvider router={router} />
}
