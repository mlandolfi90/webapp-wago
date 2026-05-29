import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Settings, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { Instance } from '@/lib/types'

type Props = {
  instance: Instance
  onDelete: (instance: Instance) => void
}

export function InstanceCard({ instance, onDelete }: Props) {
  const { t } = useTranslation()
  return (
    <Card className="overflow-hidden">
      <CardContent className="flex items-center justify-between gap-4 p-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-base font-semibold">{instance.name}</h3>
            <Badge variant={instance.connected ? 'default' : 'secondary'}>
              {instance.connected ? t('instances.connected') : t('instances.disconnected')}
            </Badge>
          </div>
          <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
            {instance.jid || t('instances.noJid')}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button variant="ghost" size="icon" asChild>
            <Link
              to={`/instances/${instance.id}`}
              aria-label={t('instances.openConfig')}
              title={t('instances.openConfig')}
            >
              <Settings className="h-4 w-4" />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(instance)}
            aria-label={t('instances.deleteAction')}
            title={t('instances.deleteAction')}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
