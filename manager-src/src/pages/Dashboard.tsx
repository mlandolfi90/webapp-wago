import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Activity, MessageCircle, Server, Webhook } from 'lucide-react'

export function Dashboard() {
  const { t } = useTranslation()

  const kpis = [
    { key: 'instances', icon: Server, value: '—' },
    { key: 'connected', icon: Activity, value: '—' },
    { key: 'messagesToday', icon: MessageCircle, value: '—' },
    { key: 'webhooksActive', icon: Webhook, value: '—' },
  ] as const

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t('dashboard.title')}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('dashboard.subtitle')}
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.key}>
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
          <CardDescription>{t('dashboard.placeholderNote')}</CardDescription>
        </CardHeader>
      </Card>
    </div>
  )
}
