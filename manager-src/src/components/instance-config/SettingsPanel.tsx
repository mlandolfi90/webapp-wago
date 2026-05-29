import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Save } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { ApiError } from '@/lib/api/client'
import {
  getAdvancedSettings,
  updateAdvancedSettings,
} from '@/lib/api/settings'
import type { AdvancedSettings } from '@/lib/types'

type Props = { instanceId: string; instanceToken: string }

const defaults: AdvancedSettings = {
  alwaysOnline: false,
  rejectCall: false,
  msgRejectCall: '',
  readMessages: false,
  ignoreGroups: false,
  ignoreStatus: false,
  ignoreFromMe: true,
}

export function SettingsPanel({ instanceId, instanceToken }: Props) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [form, setForm] = useState<AdvancedSettings>(defaults)
  const [dirty, setDirty] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['advancedSettings', instanceId],
    queryFn: () => getAdvancedSettings(instanceId, instanceToken),
    enabled: Boolean(instanceId && instanceToken),
  })

  useEffect(() => {
    if (data) {
      setForm({ ...defaults, ...data })
      setDirty(false)
    }
  }, [data])

  const mutation = useMutation({
    mutationFn: () => updateAdvancedSettings(instanceId, instanceToken, form),
    onSuccess: () => {
      toast.success(t('settings.saveOk'))
      qc.invalidateQueries({ queryKey: ['advancedSettings', instanceId] })
      setDirty(false)
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : t('settings.saveErr')),
  })

  const toggle = <K extends keyof AdvancedSettings>(k: K, v: AdvancedSettings[K]) => {
    setForm({ ...form, [k]: v })
    setDirty(true)
  }

  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
    )
  }

  const rows: Array<{ key: keyof AdvancedSettings; label: string; desc: string }> = [
    { key: 'alwaysOnline', label: t('settings.alwaysOnline'), desc: t('settings.alwaysOnlineDesc') },
    { key: 'rejectCall', label: t('settings.rejectCall'), desc: t('settings.rejectCallDesc') },
    { key: 'readMessages', label: t('settings.readMessages'), desc: t('settings.readMessagesDesc') },
    { key: 'ignoreGroups', label: t('settings.ignoreGroups'), desc: t('settings.ignoreGroupsDesc') },
    { key: 'ignoreStatus', label: t('settings.ignoreStatus'), desc: t('settings.ignoreStatusDesc') },
    { key: 'ignoreFromMe', label: t('settings.ignoreFromMe'), desc: t('settings.ignoreFromMeDesc') },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('settings.title')}</CardTitle>
        <p className="text-sm text-muted-foreground">{t('settings.subtitle')}</p>
      </CardHeader>
      <CardContent className="space-y-5">
        <ul className="divide-y divide-border">
          {rows.map((r) => (
            <li
              key={r.key}
              className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
            >
              <div className="flex-1">
                <Label htmlFor={r.key} className="text-sm font-medium">
                  {r.label}
                </Label>
                <p className="mt-1 text-xs text-muted-foreground">{r.desc}</p>
              </div>
              <Switch
                id={r.key}
                checked={Boolean(form[r.key])}
                onCheckedChange={(v) => toggle(r.key, v as never)}
              />
            </li>
          ))}
        </ul>

        <Separator />

        <div className="space-y-2">
          <Label htmlFor="msgRejectCall">{t('settings.msgRejectCall')}</Label>
          <Input
            id="msgRejectCall"
            value={form.msgRejectCall}
            onChange={(e) => {
              setForm({ ...form, msgRejectCall: e.target.value })
              setDirty(true)
            }}
            placeholder={t('settings.msgRejectCallPlaceholder')}
          />
          <p className="text-xs text-muted-foreground">
            {t('settings.msgRejectCallHint')}
          </p>
        </div>

        <div className="flex justify-end">
          <Button onClick={() => mutation.mutate()} disabled={!dirty || mutation.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {mutation.isPending ? t('common.saving') : t('common.save')}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
