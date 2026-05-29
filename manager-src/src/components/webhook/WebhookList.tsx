import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { deleteWebhook, listWebhooks } from '@/lib/api/webhooks'
import { ApiError } from '@/lib/api/client'
import type { Webhook } from '@/lib/types'
import { WebhookFormDialog } from './WebhookFormDialog'

type Props = {
  instanceToken: string
}

export function WebhookList({ instanceToken }: Props) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [editing, setEditing] = useState<Webhook | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const { data: webhooks = [], isLoading } = useQuery({
    queryKey: ['webhooks', instanceToken],
    queryFn: () => listWebhooks(instanceToken),
    enabled: Boolean(instanceToken),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteWebhook(instanceToken, id),
    onSuccess: () => {
      toast.success(t('webhook.deleteOk'))
      qc.invalidateQueries({ queryKey: ['webhooks', instanceToken] })
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : t('webhook.deleteErr'))
    },
  })

  const openCreate = () => {
    setEditing(null)
    setDialogOpen(true)
  }

  const openEdit = (w: Webhook) => {
    setEditing(w)
    setDialogOpen(true)
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>{t('webhook.sectionTitle')}</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('webhook.sectionSubtitle')}
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          {t('webhook.addAction')}
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {t('common.loading')}
          </p>
        ) : webhooks.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {t('webhook.empty')}
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {webhooks.map((w) => (
              <li
                key={w.id}
                className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-mono text-sm">{w.url}</span>
                    <Badge variant={w.enabled ? 'default' : 'secondary'}>
                      {w.enabled ? t('webhook.statusOn') : t('webhook.statusOff')}
                    </Badge>
                    {w.chatType !== 'any' && (
                      <Badge variant="outline">
                        {t(`webhook.chatType.${w.chatType}`)}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {(w.events ?? []).length} {t('webhook.eventsCount')}
                    {' · '}
                    {summarizeFilter(w, t)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEdit(w)}
                    aria-label={t('webhook.editAction')}
                    title={t('webhook.editAction')}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteMutation.mutate(w.id)}
                    disabled={deleteMutation.isPending}
                    aria-label={t('webhook.deleteAction')}
                    title={t('webhook.deleteAction')}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <Separator className="my-4" />
        <p className="text-xs text-muted-foreground">{t('webhook.tokenHint')}</p>
      </CardContent>

      <WebhookFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        instanceToken={instanceToken}
        initial={editing}
      />
    </Card>
  )
}

function summarizeFilter(
  w: Webhook,
  t: (k: string) => string,
): string {
  const counts: string[] = []
  if (w.chatIds?.length) counts.push(`${w.chatIds.length} ${t('webhook.chatIdsShort')}`)
  if (w.chatNames?.length)
    counts.push(`${w.chatNames.length} ${t('webhook.chatNamesShort')}`)
  if (w.senders?.length) counts.push(`${w.senders.length} ${t('webhook.sendersShort')}`)
  if (w.senderNames?.length)
    counts.push(`${w.senderNames.length} ${t('webhook.senderNamesShort')}`)
  return counts.length ? counts.join(', ') : t('webhook.noFilters')
}
