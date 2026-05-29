import { useTranslation } from 'react-i18next'
import { useQueries, useQuery } from '@tanstack/react-query'
import { Activity, MessageCircle, RefreshCw, Server, Webhook } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { listInstances } from '@/lib/api/instances'
import { listWebhooks } from '@/lib/api/webhooks'

export function Dashboard() {
  const { t } = useTranslation()

  const instancesQ = useQuery({
    queryKey: ['instances'],
    queryFn: listInstances,
    refetchInterval: 30_000,
  })

  // Pedimos webhooks por cada instancia en paralelo. La cota
  // `MaxWebhooksPerInstance=20` mantiene esto barato incluso con muchas
  // instancias. `useQueries` agrupa todos los results en un array y nos
  // deja saber cuándo todos terminaron (sin block del render).
  const webhookQueries = useQueries({
    queries: (instancesQ.data ?? []).map((instance) => ({
      queryKey: ['webhooks', instance.token],
      queryFn: () => listWebhooks(instance.token),
      enabled: Boolean(instance.token),
      // Toleramos errores per-instance (token expirado, etc) — el counter
      // ignora la instancia fallida en vez de romper el dashboard entero.
      retry: 0,
    })),
  })

  const instancesCount = instancesQ.data?.length ?? 0
  const connectedCount =
    instancesQ.data?.filter((i) => i.connected).length ?? 0
  const webhooksTotal = webhookQueries.reduce(
    (acc, q) => acc + (q.data?.length ?? 0),
    0,
  )
  const webhooksActive = webhookQueries.reduce(
    (acc, q) => acc + (q.data?.filter((w) => w.enabled).length ?? 0),
    0,
  )

  const loading = instancesQ.isLoading
  const fetching =
    instancesQ.isFetching || webhookQueries.some((q) => q.isFetching)

  const kpis = [
    {
      key: 'instances',
      icon: Server,
      value: loading ? '…' : String(instancesCount),
    },
    {
      key: 'connected',
      icon: Activity,
      value: loading ? '…' : String(connectedCount),
    },
    {
      key: 'messagesToday',
      icon: MessageCircle,
      // El backend no expone counter "mensajes hoy" sin polling pesado.
      // Mantenemos placeholder honesto hasta que exista el endpoint.
      value: '—',
      placeholder: true,
    },
    {
      key: 'webhooksActive',
      icon: Webhook,
      value: loading ? '…' : `${webhooksActive}/${webhooksTotal}`,
    },
  ] as const

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t('dashboard.title')}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('dashboard.subtitle')}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => instancesQ.refetch()}
          disabled={fetching}
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${fetching ? 'animate-spin' : ''}`}
          />
          {t('common.refresh')}
        </Button>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.key} data-testid={`kpi-${kpi.key}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t(`dashboard.kpi.${kpi.key}`)}
              </CardTitle>
              <kpi.icon className="h-4 w-4 text-brand" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{kpi.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardDescription>{t('dashboard.tip')}</CardDescription>
        </CardHeader>
      </Card>
    </div>
  )
}
