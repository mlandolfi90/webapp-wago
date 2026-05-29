import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Save, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ApiError } from '@/lib/api/client'
import { deleteProxy, setProxy } from '@/lib/api/proxy'
import type { Instance, ProxyConfig } from '@/lib/types'

type Props = { instance: Instance }

const empty: ProxyConfig = {
  protocol: 'http',
  host: '',
  port: 8080,
  username: '',
  password: '',
}

export function ProxyPanel({ instance }: Props) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [form, setForm] = useState<ProxyConfig>(
    instance.proxy ? parseProxyString(instance.proxy) : empty,
  )

  const saveMut = useMutation({
    mutationFn: () => setProxy(instance.id, form),
    onSuccess: () => {
      toast.success(t('proxy.saveOk'))
      qc.invalidateQueries({ queryKey: ['instance', instance.id] })
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : t('proxy.saveErr')),
  })

  const deleteMut = useMutation({
    mutationFn: () => deleteProxy(instance.id),
    onSuccess: () => {
      toast.success(t('proxy.deleteOk'))
      setForm(empty)
      qc.invalidateQueries({ queryKey: ['instance', instance.id] })
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : t('proxy.deleteErr')),
  })

  const patch = <K extends keyof ProxyConfig>(k: K, v: ProxyConfig[K]) =>
    setForm({ ...form, [k]: v })

  const canSave = Boolean(form.host && form.port)

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('proxy.title')}</CardTitle>
        <p className="text-sm text-muted-foreground">{t('proxy.subtitle')}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>{t('proxy.protocol')}</Label>
            <Select
              value={form.protocol}
              onValueChange={(v) => patch('protocol', v as ProxyConfig['protocol'])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="http">HTTP</SelectItem>
                <SelectItem value="https">HTTPS</SelectItem>
                <SelectItem value="socks5">SOCKS5</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="proxyHost">{t('proxy.host')}</Label>
            <Input
              id="proxyHost"
              value={form.host}
              onChange={(e) => patch('host', e.target.value)}
              placeholder="proxy.example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="proxyPort">{t('proxy.port')}</Label>
            <Input
              id="proxyPort"
              type="number"
              value={form.port}
              onChange={(e) => patch('port', Number(e.target.value))}
              placeholder="8080"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="proxyUser">{t('proxy.username')}</Label>
            <Input
              id="proxyUser"
              value={form.username ?? ''}
              onChange={(e) => patch('username', e.target.value)}
              placeholder={t('proxy.optional')}
              autoComplete="off"
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="proxyPass">{t('proxy.password')}</Label>
            <Input
              id="proxyPass"
              type="password"
              value={form.password ?? ''}
              onChange={(e) => patch('password', e.target.value)}
              placeholder={t('proxy.optional')}
              autoComplete="off"
            />
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="ghost"
            onClick={() => deleteMut.mutate()}
            disabled={deleteMut.isPending}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {t('proxy.deleteAction')}
          </Button>
          <Button onClick={() => saveMut.mutate()} disabled={!canSave || saveMut.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {saveMut.isPending ? t('common.saving') : t('common.save')}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// El backend persiste el proxy como string "protocol://user:pass@host:port".
// Parse best-effort para pre-cargar el form si la instancia ya tiene uno.
function parseProxyString(raw: string): ProxyConfig {
  try {
    const u = new URL(raw.includes('://') ? raw : `http://${raw}`)
    const protocol = (u.protocol.replace(':', '') as ProxyConfig['protocol']) || 'http'
    return {
      protocol: ['http', 'https', 'socks5'].includes(protocol) ? protocol : 'http',
      host: u.hostname,
      port: Number(u.port || 8080),
      username: u.username || '',
      password: u.password || '',
    }
  } catch {
    return empty
  }
}
