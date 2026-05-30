import { useQueries } from "@tanstack/react-query";
import { Activity, MessageCircle, Server, Webhook } from "lucide-react";
import { useTranslation } from "react-i18next";

import { api } from "@/lib/queries/api";
import type { MultiWebhook } from "@/lib/queries/go/multiWebhook/types";

import { Instance } from "@/types/evolution.types";

// KPIs reales para el Dashboard (feature wago, no estaba en el original).
// Cuenta instancias, conectadas, y webhooks por instancia (enabled/total)
// con useQueries paralelo. Cada query a /webhook usa el token de su
// instancia — el cliente axios lo toma del header `apikey` que sobrescribimos.

interface DashboardKpisProps {
  instances: Instance[];
}

export function DashboardKpis({ instances }: DashboardKpisProps) {
  const { t } = useTranslation();

  const webhookQueries = useQueries({
    queries: instances.map((inst) => ({
      queryKey: ["webhook", "dashboardKpi", inst.token],
      queryFn: async () => {
        const response = await api.get<{ data: MultiWebhook[]; message: string }>("/webhook", {
          headers: { apikey: inst.token ?? "" },
        });
        return response.data.data;
      },
      enabled: !!inst.token,
      retry: 0,
      staleTime: 30_000,
    })),
  });

  const instancesCount = instances.length;
  const connectedCount = instances.filter(
    (i) => i.connectionStatus === "open" || (i as { connected?: boolean }).connected === true,
  ).length;
  const webhooksTotal = webhookQueries.reduce(
    (acc, q) => acc + (q.data?.length ?? 0),
    0,
  );
  const webhooksActive = webhookQueries.reduce(
    (acc, q) => acc + (q.data?.filter((w) => w.enabled).length ?? 0),
    0,
  );

  const kpis = [
    {
      key: "instances",
      icon: Server,
      label: t("dashboard.kpi.instances", { defaultValue: "Instancias" }),
      value: String(instancesCount),
    },
    {
      key: "connected",
      icon: Activity,
      label: t("dashboard.kpi.connected", { defaultValue: "Conectadas" }),
      value: String(connectedCount),
    },
    {
      key: "messagesToday",
      icon: MessageCircle,
      label: t("dashboard.kpi.messagesToday", { defaultValue: "Mensajes hoy" }),
      value: "—",
    },
    {
      key: "webhooksActive",
      icon: Webhook,
      label: t("dashboard.kpi.webhooksActive", { defaultValue: "Webhooks activos" }),
      value: `${webhooksActive}/${webhooksTotal}`,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" data-testid="dashboard-kpis">
      {kpis.map((kpi) => (
        <div
          key={kpi.key}
          data-testid={`kpi-${kpi.key}`}
          className="rounded-lg border bg-card p-4 transition-colors hover:bg-accent/30"
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="text-muted-foreground text-sm font-medium">{kpi.label}</span>
            <kpi.icon className="text-primary h-4 w-4" />
          </div>
          <div className="text-3xl font-bold">{kpi.value}</div>
        </div>
      ))}
    </div>
  );
}
