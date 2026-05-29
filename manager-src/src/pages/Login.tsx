import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ApiError } from '@/lib/api/client'
import { login } from '@/lib/api/auth'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ThemeToggle } from '@/components/ui/theme-toggle'

const POWERED_BY_URL = 'https://github.com/EvolutionAPI/evolution-manager-v2'

export function Login() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [key, setKey] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!key.trim() || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      await login(key.trim())
      navigate('/dashboard', { replace: true })
    } catch (err) {
      if (err instanceof ApiError) {
        setError(
          err.status === 401 || err.status === 403
            ? t('login.errorInvalid')
            : err.message,
        )
      } else {
        setError(t('login.errorNetwork'))
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="grid min-h-screen place-items-center bg-background px-4"
      style={{
        backgroundImage:
          'radial-gradient(circle at top, hsl(var(--brand) / 0.15), transparent 60%)',
      }}
    >
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-3">
          <span className="inline-block h-4 w-4 rounded-full bg-brand shadow-[0_0_20px_var(--brand)]" />
          <span className="text-2xl font-semibold tracking-tight">
            {t('brand')}
          </span>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>{t('login.title')}</CardTitle>
            <CardDescription>{t('login.subtitle')}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="apikey">{t('login.apikeyLabel')}</Label>
                <Input
                  id="apikey"
                  type="password"
                  autoComplete="off"
                  autoFocus
                  placeholder={t('login.apikeyPlaceholder')}
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  disabled={submitting}
                />
              </div>
              {error && (
                <div
                  role="alert"
                  className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                >
                  {error}
                </div>
              )}
              <Button
                type="submit"
                className="w-full"
                disabled={!key.trim() || submitting}
              >
                {submitting ? t('login.submitting') : t('login.submit')}
              </Button>
              <p className="text-xs text-muted-foreground">{t('login.tip')}</p>
            </form>
          </CardContent>
        </Card>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          <a
            className="underline decoration-dotted hover:text-brand"
            href={POWERED_BY_URL}
            target="_blank"
            rel="noreferrer"
          >
            {t('poweredBy')}
          </a>
        </p>
      </div>
    </div>
  )
}
