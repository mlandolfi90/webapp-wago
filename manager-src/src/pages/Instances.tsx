import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { InstanceCard } from '@/components/InstanceCard'
import { InstanceCreateDialog } from '@/components/InstanceCreateDialog'
import { deleteInstance, listInstances } from '@/lib/api/instances'
import { ApiError } from '@/lib/api/client'
import type { Instance } from '@/lib/types'

export function Instances() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)

  const { data: instances = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['instances'],
    queryFn: listInstances,
  })

  const deleteMutation = useMutation({
    mutationFn: (i: Instance) => deleteInstance(i.id),
    onSuccess: () => {
      toast.success(t('instances.deleteOk'))
      qc.invalidateQueries({ queryKey: ['instances'] })
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : t('instances.deleteErr'))
    },
  })

  const handleDelete = (instance: Instance) => {
    if (
      !window.confirm(
        t('instances.deleteConfirm', { name: instance.name }),
      )
    )
      return
    deleteMutation.mutate(instance)
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t('instances.title')}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('instances.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`}
            />
            {t('common.refresh')}
          </Button>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t('instances.newAction')}
          </Button>
        </div>
      </header>

      {isLoading ? (
        <p className="text-center text-sm text-muted-foreground">
          {t('common.loading')}
        </p>
      ) : instances.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">{t('instances.empty')}</p>
            <Button className="mt-4" onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {t('instances.newAction')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {instances.map((instance) => (
            <li key={instance.id}>
              <InstanceCard instance={instance} onDelete={handleDelete} />
            </li>
          ))}
        </ul>
      )}

      <InstanceCreateDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  )
}
