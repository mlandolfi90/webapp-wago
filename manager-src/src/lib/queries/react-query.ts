import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { toast } from "react-toastify";

import { logout } from "./token";

let displayedNetworkFailureError = false;

// WAGO-PATCH: interceptor 401/403 global. Cuando cualquier query o
// mutation rompe con auth, asumimos que la GLOBAL_API_KEY del usuario
// se invalidó (rotada, revocada) y forzamos el flujo de login.
function on401(error: unknown) {
  if (error instanceof AxiosError) {
    const status = error.response?.status;
    if (status === 401 || status === 403) {
      logout();
      if (!window.location.pathname.endsWith("/manager/login")) {
        window.location.href = "/manager/login";
      }
    }
  }
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: on401 }),
  mutationCache: new MutationCache({ onError: on401 }),
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry(failureCount, error) {
        // Don't retry permanent client errors (4xx) — retrying them just spams the console
        if (error instanceof AxiosError) {
          const status = error.response?.status;
          if (status && status >= 400 && status < 500) return false;
        }

        if (failureCount >= 3) {
          if (displayedNetworkFailureError === false) {
            displayedNetworkFailureError = true;

            toast.error("The application is taking longer than expected to load, please try again in a few minutes.", {
              onClose: () => {
                displayedNetworkFailureError = false;
              },
            });
          }

          return false;
        }

        return true;
      },
    },
  },
});
