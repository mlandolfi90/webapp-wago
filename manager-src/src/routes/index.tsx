import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";

import ProtectedRoute from "@/components/providers/protected-route";
import PublicRoute from "@/components/providers/public-route";

import { InstanceLayout } from "@/layout/InstanceLayout";
import { MainLayout } from "@/layout/MainLayout";

// Lazy-loaded pages: cada página sale a su propio chunk. Restaura el
// code splitting del commit 675df48 que el rebase a evolution-manager-v2
// había tirado. El main chunk queda solo con shell + router + libs core.
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Connection = lazy(() =>
  import("@/pages/instance/Connection").then((m) => ({ default: m.Connection })),
);
const DangerZone = lazy(() =>
  import("@/pages/instance/DangerZone").then((m) => ({ default: m.DangerZone })),
);
const DashboardInstance = lazy(() =>
  import("@/pages/instance/DashboardInstance").then((m) => ({ default: m.DashboardInstance })),
);
const Proxy = lazy(() =>
  import("@/pages/instance/Proxy").then((m) => ({ default: m.Proxy })),
);
const SendTest = lazy(() =>
  import("@/pages/instance/SendTest").then((m) => ({ default: m.SendTest })),
);
const Settings = lazy(() =>
  import("@/pages/instance/Settings").then((m) => ({ default: m.Settings })),
);
const Webhook = lazy(() =>
  import("@/pages/instance/Webhook").then((m) => ({ default: m.Webhook })),
);
const Login = lazy(() => import("@/pages/Login"));

function PageFallback() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[40vh] items-center justify-center"
    >
      <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
    </div>
  );
}

function lazyPage(Component: React.ComponentType) {
  return (
    <Suspense fallback={<PageFallback />}>
      <Component />
    </Suspense>
  );
}

// Rutas adaptadas a webapp-wago:
// - Removidas integraciones específicas de Evolution (Chat/Chatwoot/Dify/
//   Evoai/EvolutionBot/Flowise/N8n/Openai/Typebot/Sqs/EmbedChat/
//   LicenseCallback) que no aplican al backend Go de wago.
// - Removidas también Websocket y Rabbitmq (endpoints /websocket/find
//   y /rabbitmq/find no existen en wago — eran páginas colgadas).
// - Connection/SendTest/DangerZone son features wago propias (no
//   estaban en el original).
const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/manager/" replace />,
  },
  {
    path: "/manager/login",
    element: (
      <PublicRoute>
        {lazyPage(Login)}
      </PublicRoute>
    ),
  },
  {
    path: "/manager/",
    element: (
      <ProtectedRoute>
        <MainLayout>{lazyPage(Dashboard)}</MainLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: "/manager/instance/:instanceId/dashboard",
    element: (
      <ProtectedRoute>
        <InstanceLayout>{lazyPage(DashboardInstance)}</InstanceLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: "/manager/instance/:instanceId/settings",
    element: (
      <ProtectedRoute feature="settings">
        <InstanceLayout>{lazyPage(Settings)}</InstanceLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: "/manager/instance/:instanceId/webhook",
    element: (
      <ProtectedRoute feature="webhook">
        <InstanceLayout>{lazyPage(Webhook)}</InstanceLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: "/manager/instance/:instanceId/proxy",
    element: (
      <ProtectedRoute feature="proxy">
        <InstanceLayout>{lazyPage(Proxy)}</InstanceLayout>
      </ProtectedRoute>
    ),
  },
  // Features wago (no estaban en el original):
  {
    path: "/manager/instance/:instanceId/connection",
    element: (
      <ProtectedRoute>
        <InstanceLayout>{lazyPage(Connection)}</InstanceLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: "/manager/instance/:instanceId/send-test",
    element: (
      <ProtectedRoute>
        <InstanceLayout>{lazyPage(SendTest)}</InstanceLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: "/manager/instance/:instanceId/danger",
    element: (
      <ProtectedRoute>
        <InstanceLayout>{lazyPage(DangerZone)}</InstanceLayout>
      </ProtectedRoute>
    ),
  },
]);

export default router;
