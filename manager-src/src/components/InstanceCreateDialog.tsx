import { useState } from 'react'
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
import { createInstance } from '@/lib/api/instances'
import { ApiError } from '@/lib/api/client'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function InstanceCreateDialog({ open, onOpenChange }: Props) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [name, setName] = useState('')

  const mutation = useMutation({
    mutationFn: () =>
      createInstance({
        name: name.trim(),
        // El backend Go exige `token` no vacío. Generamos un UUID en el
        // browser; el usuario puede recuperarlo desde el detalle.
        token: crypto.randomUUID(),
      }),
    onSuccess: () => {
      toast.success(t('instances.createOk'))
      qc.invalidateQueries({ queryKey: ['instances'] })
      onOpenChange(false)
      setName('')
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : t('instances.createErr'))
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('instances.createTitle')}</DialogTitle>
          <DialogDescription>{t('instances.createSubtitle')}</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (name.trim()) mutation.mutate()
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="instanceName">{t('instances.nameLabel')}</Label>
            <Input
              id="instanceName"
              autoFocus
              autoComplete="off"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('instances.namePlaceholder')}
              disabled={mutation.isPending}
            />
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
            <Button type="submit" disabled={!name.trim() || mutation.isPending}>
              {mutation.isPending ? t('common.saving') : t('common.create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
