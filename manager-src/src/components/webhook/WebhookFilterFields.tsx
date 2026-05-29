import { useTranslation } from 'react-i18next'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { WebhookChatType } from '@/lib/types'

export type FilterFieldsValue = {
  chatType: WebhookChatType
  chatIds: string
  senders: string
  chatNames: string
  senderNames: string
}

type Props = {
  value: FilterFieldsValue
  onChange: (next: FilterFieldsValue) => void
}

export function WebhookFilterFields({ value, onChange }: Props) {
  const { t } = useTranslation()

  const patch = <K extends keyof FilterFieldsValue>(
    k: K,
    v: FilterFieldsValue[K],
  ) => onChange({ ...value, [k]: v })

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>{t('webhook.fields.chatType')}</Label>
        <Select
          value={value.chatType}
          onValueChange={(v) => patch('chatType', v as WebhookChatType)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">{t('webhook.chatType.any')}</SelectItem>
            <SelectItem value="group">{t('webhook.chatType.group')}</SelectItem>
            <SelectItem value="private">{t('webhook.chatType.private')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>{t('webhook.fields.chatIds')}</Label>
          <Textarea
            rows={3}
            placeholder={t('webhook.fields.chatIdsPlaceholder')}
            value={value.chatIds}
            onChange={(e) => patch('chatIds', e.target.value)}
          />
          <p className="text-xs text-muted-foreground">{t('webhook.fields.glob')}</p>
        </div>

        <div className="space-y-2">
          <Label>{t('webhook.fields.chatNames')}</Label>
          <Textarea
            rows={3}
            placeholder={t('webhook.fields.chatNamesPlaceholder')}
            value={value.chatNames}
            onChange={(e) => patch('chatNames', e.target.value)}
          />
          <p className="text-xs text-muted-foreground">{t('webhook.fields.glob')}</p>
        </div>

        <div className="space-y-2">
          <Label>{t('webhook.fields.senders')}</Label>
          <Textarea
            rows={3}
            placeholder={t('webhook.fields.sendersPlaceholder')}
            value={value.senders}
            onChange={(e) => patch('senders', e.target.value)}
          />
          <p className="text-xs text-muted-foreground">{t('webhook.fields.glob')}</p>
        </div>

        <div className="space-y-2">
          <Label>{t('webhook.fields.senderNames')}</Label>
          <Textarea
            rows={3}
            placeholder={t('webhook.fields.senderNamesPlaceholder')}
            value={value.senderNames}
            onChange={(e) => patch('senderNames', e.target.value)}
          />
          <p className="text-xs text-muted-foreground">{t('webhook.fields.glob')}</p>
        </div>
      </div>
    </div>
  )
}

export function listToText(list: string[] | null | undefined): string {
  return (list ?? []).join('\n')
}

export function textToList(text: string): string[] {
  return text
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
}
