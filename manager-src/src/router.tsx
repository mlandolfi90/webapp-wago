import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'
import { AuthGate } from '@/layouts/AuthGate'
import { Shell } from '@/layouts/Shell'
import { Login } from '@/pages/Login'
import { Dashboard } from '@/pages/Dashboard'
import { NotFound } from '@/pages/NotFound'

// El backend Go sirve este SPA bajo /manager/* — `basename` evita rebotes
// de rutas y mantiene `BrowserRouter` con URLs limpias.
const router = createBrowserRouter(
  [
    { path: '/login', element: <Login /> },
    {
      element: <AuthGate />,
      children: [
        {
          element: <Shell />,
          children: [
            { path: '/', element: <Navigate to="/dashboard" replace /> },
            { path: '/dashboard', element: <Dashboard /> },
            { path: '/instances', element: <Dashboard /> },
          ],
        },
      ],
    },
    { path: '*', element: <NotFound /> },
  ],
  { basename: '/manager' },
)

export function AppRouter() {
  return <RouterProvider router={router} />
}
