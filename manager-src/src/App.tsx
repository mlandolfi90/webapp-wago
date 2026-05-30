import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { ThemeProvider } from '@/lib/theme/theme-provider'
import { ApiError, clearApiKey } from '@/lib/api/client'
import { AppRouter } from '@/router'

// Cuando cualquier query o mutation rompe con 401/403, asumimos que la
// GLOBAL_API_KEY se invalidó (rotada por el admin, revocada, etc.). El
// AuthGate del router solo lee localStorage al mount, así que sin esto
// el usuario queda en la SPA viendo errores hasta que recargue. Limpiar
// la key + forzar full reload manda al Login y resincroniza el estado.
function on401(err: unknown) {
  if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
    clearApiKey()
    // Hard navigation evita inconsistencias con el cache de TanStack Query.
    if (!window.location.pathname.endsWith('/manager/login')) {
      window.location.href = '/manager/login'
    }
  }
}

const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: on401 }),
  mutationCache: new MutationCache({ onError: on401 }),
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 15_000,
    },
  },
})

export function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AppRouter />
        <Toaster position="top-right" richColors closeButton />
      </QueryClientProvider>
    </ThemeProvider>
  )
}
