import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { WebhookList } from '@/components/webhook/WebhookList'
import { getInstance } from '@/lib/api/instances'

export function InstanceConfig() {
  const { t } = useTranslation()
  const { instanceId = '' } = useParams<{ instanceId: string }>()

  const { data: instance, isLoading, error } = useQuery({
    queryKey: ['instance', instanceId],
    queryFn: () => getInstance(instanceId),
    enabled: Boolean(instanceId),
  })

  if (isLoading) {
    return (
      <p className="text-center text-sm text-muted-foreground">
        {t('common.loading')}
      </p>
    )
  }

  if (error || !instance) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/instances">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('common.back')}
          </Link>
        </Button>
        <p className="text-center text-sm text-destructive">
          {t('instanceConfig.notFound')}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link to="/instances">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('common.back')}
        </Link>
      </Button>

      <header>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{instance.name}</h1>
          <Badge variant={instance.connected ? 'default' : 'secondary'}>
            {instance.connected
              ? t('instances.connected')
              : t('instances.disconnected')}
          </Badge>
        </div>
        <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
          {instance.jid || t('instances.noJid')}
        </p>
      </header>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">{t('instanceConfig.tabs.info')}</TabsTrigger>
          <TabsTrigger value="webhooks">
            {t('instanceConfig.tabs.webhooks')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <Card>
            <CardHeader>
              <CardTitle>{t('instanceConfig.infoTitle')}</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-3 sm:grid-cols-2">
                <Row label={t('instanceConfig.fields.id')} value={instance.id} mono />
                <Row
                  label={t('instanceConfig.fields.token')}
                  value={instance.token}
                  mono
                />
                <Row
                  label={t('instanceConfig.fields.jid')}
                  value={instance.jid || '—'}
                  mono
                />
                <Row
                  label={t('instanceConfig.fields.createdAt')}
                  value={new Date(instance.createdAt).toLocaleString()}
                />
                <Row
                  label={t('instanceConfig.fields.events')}
                  value={instance.events || '—'}
                />
                <Row
                  label={t('instanceConfig.fields.osName')}
                  value={instance.os_name || '—'}
                />
              </dl>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="webhooks">
          <WebhookList instanceToken={instance.token} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function Row({
  label,
  value,
  mono,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="space-y-1">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd
        className={`break-all text-sm ${mono ? 'font-mono' : ''}`}
      >
        {value}
      </dd>
    </div>
  )
}
