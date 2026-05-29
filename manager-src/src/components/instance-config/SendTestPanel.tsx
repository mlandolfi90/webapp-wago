import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation } from '@tanstack/react-query'
import { Send } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ApiError } from '@/lib/api/client'
import { sendText } from '@/lib/api/sendMessage'

type Props = { instanceToken: string }

export function SendTestPanel({ instanceToken }: Props) {
  const { t } = useTranslation()
  const [number, setNumber] = useState('')
  const [text, setText] = useState('')

  const mutation = useMutation({
    mutationFn: () => sendText(instanceToken, { number: number.trim(), text }),
    onSuccess: () => {
      toast.success(t('sendTest.sendOk'))
      setText('')
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : t('sendTest.sendErr')),
  })

  const canSend = number.trim() && text.trim() && !mutation.isPending

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('sendTest.title')}</CardTitle>
        <p className="text-sm text-muted-foreground">{t('sendTest.subtitle')}</p>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (canSend) mutation.mutate()
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="sendNumber">{t('sendTest.number')}</Label>
            <Input
              id="sendNumber"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              placeholder="5491100000000"
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">{t('sendTest.numberHint')}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sendText">{t('sendTest.text')}</Label>
            <Textarea
              id="sendText"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t('sendTest.textPlaceholder')}
              rows={4}
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={!canSend}>
              <Send className="mr-2 h-4 w-4" />
              {mutation.isPending ? t('sendTest.sending') : t('sendTest.sendAction')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
