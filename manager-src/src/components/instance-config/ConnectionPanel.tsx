import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { LogOut, Play, RefreshCw, Square } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { ApiError } from '@/lib/api/client'
import {
  connect,
  disconnect,
  getQr,
  getStatus,
  logout,
} from '@/lib/api/connection'

type Props = { instanceToken: string; instanceId: string }

export function ConnectionPanel({ instanceToken, instanceId }: Props) {
  const { t } = useTranslation()
  const qc = useQueryClient()

  const { data: status, refetch: refetchStatus } = useQuery({
    queryKey: ['connectionStatus', instanceToken],
    queryFn: () => getStatus(instanceToken),
    enabled: Boolean(instanceToken),
    refetchInterval: (q) => (q.state.data?.Connected ? false : 3000),
  })

  const connected = Boolean(status?.Connected)

  const { data: qr } = useQuery({
    queryKey: ['qr', instanceToken],
    queryFn: () => getQr(instanceToken),
    enabled: Boolean(instanceToken) && !connected,
    refetchInterval: connected ? false : 3000,
  })

  const connectMut = useMutation({
    mutationFn: () => connect(instanceToken),
    onSuccess: () => {
      toast.success(t('connection.connectingOk'))
      qc.invalidateQueries({ queryKey: ['connectionStatus', instanceToken] })
      qc.invalidateQueries({ queryKey: ['qr', instanceToken] })
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : t('connection.connectErr')),
  })

  const disconnectMut = useMutation({
    mutationFn: () => disconnect(instanceToken),
    onSuccess: () => {
      toast.success(t('connection.disconnectOk'))
      qc.invalidateQueries({ queryKey: ['connectionStatus', instanceToken] })
      qc.invalidateQueries({ queryKey: ['instance', instanceId] })
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : t('connection.disconnectErr')),
  })

  const logoutMut = useMutation({
    mutationFn: () => logout(instanceToken),
    onSuccess: () => {
      toast.success(t('connection.logoutOk'))
      qc.invalidateQueries({ queryKey: ['connectionStatus', instanceToken] })
      qc.invalidateQueries({ queryKey: ['instance', instanceId] })
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : t('connection.logoutErr')),
  })

  const qrSrc = qr?.Qrcode
    ? qr.Qrcode.startsWith('data:')
      ? qr.Qrcode
      : `data:image/png;base64,${qr.Qrcode}`
    : null

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>{t('connection.title')}</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">{t('connection.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={connected ? 'default' : 'secondary'}>
            {connected ? t('connection.statusConnected') : t('connection.statusDisconnected')}
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => refetchStatus()}
            aria-label={t('common.refresh')}
            title={t('common.refresh')}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {connected ? (
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{t('connection.loggedInAs')}</p>
            <p className="font-mono text-sm break-all">{status?.myJid || '—'}</p>
            {status?.Name && (
              <p className="text-sm">
                {t('connection.profileName')}: <strong>{status.Name}</strong>
              </p>
            )}
          </div>
        ) : qrSrc ? (
          <div className="flex flex-col items-center gap-3 py-2">
            <img
              src={qrSrc}
              alt="QR"
              className="h-64 w-64 rounded-lg border border-border bg-white p-2"
            />
            <p className="text-center text-xs text-muted-foreground">
              {t('connection.qrHint')}
            </p>
          </div>
        ) : (
          <p className="text-center text-sm text-muted-foreground">
            {t('connection.waitingForQr')}
          </p>
        )}

        <Separator />

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="ghost"
            onClick={() => logoutMut.mutate()}
            disabled={!connected || logoutMut.isPending}
          >
            <LogOut className="mr-2 h-4 w-4" />
            {t('connection.logoutAction')}
          </Button>
          <Button
            variant="ghost"
            onClick={() => disconnectMut.mutate()}
            disabled={!connected || disconnectMut.isPending}
          >
            <Square className="mr-2 h-4 w-4" />
            {t('connection.disconnectAction')}
          </Button>
          <Button
            onClick={() => connectMut.mutate()}
            disabled={connected || connectMut.isPending}
          >
            <Play className="mr-2 h-4 w-4" />
            {t('connection.connectAction')}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
