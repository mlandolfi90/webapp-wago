import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { ApiError } from '@/lib/api/client'
import { deleteInstance } from '@/lib/api/instances'
import type { Instance } from '@/lib/types'

type Props = { instance: Instance }

export function DangerZonePanel({ instance }: Props) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')

  const mutation = useMutation({
    mutationFn: () => deleteInstance(instance.id),
    onSuccess: () => {
      toast.success(t('danger.deleteOk'))
      qc.invalidateQueries({ queryKey: ['instances'] })
      navigate('/instances', { replace: true })
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : t('danger.deleteErr')),
  })

  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          {t('danger.title')}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{t('danger.subtitle')}</p>
      </CardHeader>
      <CardContent>
        <Button
          variant="destructive"
          onClick={() => setOpen(true)}
          aria-label={t('danger.deleteAction')}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          {t('danger.deleteAction')}
        </Button>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">{t('danger.confirmTitle')}</DialogTitle>
            <DialogDescription>
              {t('danger.confirmSubtitle', { name: instance.name })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="confirmName">
              {t('danger.confirmTypeName', { name: instance.name })}
            </Label>
            <Input
              id="confirmName"
              autoFocus
              autoComplete="off"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setOpen(false)
                setConfirmText('')
              }}
              disabled={mutation.isPending}
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              disabled={confirmText !== instance.name || mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending ? t('common.saving') : t('danger.deleteConfirmAction')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
