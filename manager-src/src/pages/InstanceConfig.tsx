import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  ArrowLeft,
  Cable,
  Info,
  Send,
  Settings,
  ShieldAlert,
  Webhook as WebhookIcon,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { WebhookList } from '@/components/webhook/WebhookList'
import { ConnectionPanel } from '@/components/instance-config/ConnectionPanel'
import { SettingsPanel } from '@/components/instance-config/SettingsPanel'
import { ProxyPanel } from '@/components/instance-config/ProxyPanel'
import { SendTestPanel } from '@/components/instance-config/SendTestPanel'
import { DangerZonePanel } from '@/components/instance-config/DangerZonePanel'
import { getInstance } from '@/lib/api/instances'
import { cn } from '@/lib/utils'

type SectionKey =
  | 'info'
  | 'connection'
  | 'webhooks'
  | 'settings'
  | 'proxy'
  | 'send'
  | 'danger'

export function InstanceConfig() {
  const { t } = useTranslation()
  const { instanceId = '' } = useParams<{ instanceId: string }>()
  const [section, setSection] = useState<SectionKey>('info')

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

  const sections: Array<{
    key: SectionKey
    icon: typeof Info
    label: string
    danger?: boolean
  }> = [
    { key: 'info', icon: Info, label: t('instanceConfig.tabs.info') },
    { key: 'connection', icon: Cable, label: t('instanceConfig.tabs.connection') },
    { key: 'webhooks', icon: WebhookIcon, label: t('instanceConfig.tabs.webhooks') },
    { key: 'settings', icon: Settings, label: t('instanceConfig.tabs.settings') },
    { key: 'proxy', icon: ShieldAlert, label: t('instanceConfig.tabs.proxy') },
    { key: 'send', icon: Send, label: t('instanceConfig.tabs.send') },
    { key: 'danger', icon: AlertTriangle, label: t('instanceConfig.tabs.danger'), danger: true },
  ]

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

      {/* Mobile selector */}
      <div className="md:hidden">
        <Select value={section} onValueChange={(v) => setSection(v as SectionKey)}>
          <SelectTrigger aria-label={t('instanceConfig.sectionLabel')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sections.map((s) => (
              <SelectItem key={s.key} value={s.key}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="md:grid md:grid-cols-[220px_1fr] md:gap-6">
        {/* Desktop sidebar */}
        <nav
          className="hidden md:flex md:flex-col md:gap-1"
          aria-label={t('instanceConfig.sectionLabel')}
        >
          {sections.map((s) => (
            <button
              key={s.key}
              type="button"
              role="tab"
              aria-selected={section === s.key}
              onClick={() => setSection(s.key)}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors',
                section === s.key
                  ? s.danger
                    ? 'bg-destructive/10 text-destructive'
                    : 'bg-primary/10 text-brand'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              )}
            >
              <s.icon className="h-4 w-4" />
              {s.label}
            </button>
          ))}
        </nav>

        <div role="tabpanel">
          {section === 'info' && <InfoSection instance={instance} t={t} />}
          {section === 'connection' && (
            <ConnectionPanel instanceToken={instance.token} instanceId={instance.id} />
          )}
          {section === 'webhooks' && <WebhookList instanceToken={instance.token} />}
          {section === 'settings' && (
            <SettingsPanel instanceId={instance.id} instanceToken={instance.token} />
          )}
          {section === 'proxy' && <ProxyPanel instance={instance} />}
          {section === 'send' && <SendTestPanel instanceToken={instance.token} />}
          {section === 'danger' && <DangerZonePanel instance={instance} />}
        </div>
      </div>
    </div>
  )
}

function InfoSection({
  instance,
  t,
}: {
  instance: import('@/lib/types').Instance
  t: (k: string) => string
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('instanceConfig.infoTitle')}</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-3 sm:grid-cols-2">
          <Row label={t('instanceConfig.fields.id')} value={instance.id} mono />
          <Row label={t('instanceConfig.fields.token')} value={instance.token} mono />
          <Row label={t('instanceConfig.fields.jid')} value={instance.jid || '—'} mono />
          <Row
            label={t('instanceConfig.fields.createdAt')}
            value={new Date(instance.createdAt).toLocaleString()}
          />
          <Row label={t('instanceConfig.fields.events')} value={instance.events || '—'} />
          <Row label={t('instanceConfig.fields.osName')} value={instance.os_name || '—'} />
        </dl>
      </CardContent>
    </Card>
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
      <dd className={`break-all text-sm ${mono ? 'font-mono' : ''}`}>{value}</dd>
    </div>
  )
}
