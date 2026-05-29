import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { createWebhook, updateWebhook } from '@/lib/api/webhooks'
import { ApiError } from '@/lib/api/client'
import type { Webhook, WebhookInput } from '@/lib/types'
import {
  WebhookFilterFields,
  listToText,
  textToList,
  type FilterFieldsValue,
} from './WebhookFilterFields'

// Las constantes del backend están en MAYÚSCULAS (pkg/internal/event_types).
// Cualquier valor fuera de esta lista hace que el backend rechace con
// "event type inválido".
const KNOWN_EVENTS = [
  'MESSAGE',
  'SEND_MESSAGE',
  'READ_RECEIPT',
  'PRESENCE',
  'CONNECTION',
  'CALL',
  'GROUP',
  'CONTACT',
  'QRCODE',
]

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  instanceToken: string
  initial?: Webhook | null
}

const emptyFilter: FilterFieldsValue = {
  chatType: 'any',
  chatIds: '',
  senders: '',
  chatNames: '',
  senderNames: '',
}

export function WebhookFormDialog({
  open,
  onOpenChange,
  instanceToken,
  initial,
}: Props) {
  const { t } = useTranslation()
  const qc = useQueryClient()

  const [url, setUrl] = useState('')
  const [enabled, setEnabled] = useState(true)
  const [ignoreFromMe, setIgnoreFromMe] = useState(true)
  const [eventsText, setEventsText] = useState(KNOWN_EVENTS.join('\n'))
  const [filter, setFilter] = useState<FilterFieldsValue>(emptyFilter)
  // ADR 0055: transports per-webhook.
  const [rabbitmqEnable, setRabbitmqEnable] = useState(false)
  const [websocketEnable, setWebsocketEnable] = useState(false)
  const [natsEnable, setNatsEnable] = useState(false)

  useEffect(() => {
    if (!open) return
    if (initial) {
      setUrl(initial.url)
      setEnabled(initial.enabled)
      setIgnoreFromMe(initial.ignoreFromMe)
      setEventsText((initial.events ?? KNOWN_EVENTS).join('\n'))
      setFilter({
        chatType: initial.chatType,
        chatIds: listToText(initial.chatIds),
        senders: listToText(initial.senders),
        chatNames: listToText(initial.chatNames),
        senderNames: listToText(initial.senderNames),
      })
      setRabbitmqEnable(initial.rabbitmqEnable ?? false)
      setWebsocketEnable(initial.websocketEnable ?? false)
      setNatsEnable(initial.natsEnable ?? false)
    } else {
      setUrl('')
      setEnabled(true)
      setIgnoreFromMe(true)
      setEventsText(KNOWN_EVENTS.join('\n'))
      setFilter(emptyFilter)
      setRabbitmqEnable(false)
      setWebsocketEnable(false)
      setNatsEnable(false)
    }
  }, [open, initial])

  const buildInput = (): WebhookInput => ({
    url: url.trim(),
    enabled,
    ignoreFromMe,
    events: textToList(eventsText),
    chatType: filter.chatType,
    chatIds: textToList(filter.chatIds),
    senders: textToList(filter.senders),
    chatNames: textToList(filter.chatNames),
    senderNames: textToList(filter.senderNames),
    rabbitmqEnable,
    websocketEnable,
    natsEnable,
  })

  const mutation = useMutation({
    mutationFn: () =>
      initial
        ? updateWebhook(instanceToken, initial.id, buildInput())
        : createWebhook(instanceToken, buildInput()),
    onSuccess: () => {
      toast.success(initial ? t('webhook.updateOk') : t('webhook.createOk'))
      qc.invalidateQueries({ queryKey: ['webhooks', instanceToken] })
      onOpenChange(false)
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : t('webhook.saveErr'))
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {initial ? t('webhook.editTitle') : t('webhook.createTitle')}
          </DialogTitle>
          <DialogDescription>{t('webhook.subtitle')}</DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (url.trim()) mutation.mutate()
          }}
          className="space-y-5"
        >
          <div className="space-y-2">
            <Label htmlFor="webhookUrl">{t('webhook.fields.url')}</Label>
            <Input
              id="webhookUrl"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/webhook"
              required
            />
          </div>

          <div className="flex flex-wrap gap-6">
            <ToggleRow
              id="enabled"
              checked={enabled}
              onCheckedChange={setEnabled}
              label={t('webhook.fields.enabled')}
            />
            <ToggleRow
              id="ignoreFromMe"
              checked={ignoreFromMe}
              onCheckedChange={setIgnoreFromMe}
              label={t('webhook.fields.ignoreFromMe')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="webhookEvents">{t('webhook.fields.events')}</Label>
            <Textarea
              id="webhookEvents"
              rows={4}
              value={eventsText}
              onChange={(e) => setEventsText(e.target.value)}
              placeholder={KNOWN_EVENTS.join('\n')}
            />
            <p className="text-xs text-muted-foreground">
              {t('webhook.fields.eventsHint')}
            </p>
          </div>

          <Separator />

          <div>
            <h4 className="mb-3 text-sm font-medium">{t('webhook.filterSection')}</h4>
            <WebhookFilterFields value={filter} onChange={setFilter} />
          </div>

          <Separator />

          <div>
            <h4 className="mb-3 text-sm font-medium">{t('webhook.transportsSection')}</h4>
            <p className="mb-3 text-xs text-muted-foreground">
              {t('webhook.transportsHint')}
            </p>
            <div className="flex flex-wrap gap-x-6 gap-y-3">
              <ToggleRow
                id="rabbitmqEnable"
                checked={rabbitmqEnable}
                onCheckedChange={setRabbitmqEnable}
                label="RabbitMQ"
              />
              <ToggleRow
                id="websocketEnable"
                checked={websocketEnable}
                onCheckedChange={setWebsocketEnable}
                label="WebSocket"
              />
              <ToggleRow
                id="natsEnable"
                checked={natsEnable}
                onCheckedChange={setNatsEnable}
                label="NATS"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={!url.trim() || mutation.isPending}>
              {mutation.isPending ? t('common.saving') : t('common.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ToggleRow({
  id,
  checked,
  onCheckedChange,
  label,
}: {
  id: string
  checked: boolean
  onCheckedChange: (v: boolean) => void
  label: string
}) {
  return (
    <div className="flex items-center gap-2">
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
      <Label htmlFor={id} className="cursor-pointer">
        {label}
      </Label>
    </div>
  )
}
