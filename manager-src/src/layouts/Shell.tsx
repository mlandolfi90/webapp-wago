import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LayoutDashboard, ListChecks, LogOut, FileCode2 } from 'lucide-react'
import { logout } from '@/lib/api/auth'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { cn } from '@/lib/utils'

const POWERED_BY_URL = 'https://github.com/EvolutionAPI/evolution-manager-v2'

export function Shell() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: t('nav.dashboard') },
    { to: '/instances', icon: ListChecks, label: t('nav.instances') },
  ]

  return (
    <div className="grid min-h-screen grid-cols-1 grid-rows-[auto_1fr_auto] bg-background text-foreground md:grid-cols-[260px_1fr]">
      <aside className="hidden border-r border-border bg-card/40 px-4 py-6 md:col-start-1 md:row-span-3 md:flex md:flex-col">
        <BrandHeader />
        <nav className="mt-6 flex flex-col gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/10 text-brand'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                )
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto pt-4 text-xs text-muted-foreground">v0.1.0</div>
      </aside>

      <header className="row-start-1 flex items-center justify-between border-b border-border bg-card/40 px-4 py-3 md:col-start-2">
        <div className="flex items-center gap-3 md:hidden">
          <BrandHeader compact />
        </div>
        <div className="hidden md:block" aria-hidden />
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <a href="/swagger/index.html" target="_blank" rel="noreferrer">
              <FileCode2 className="mr-2 h-4 w-4" />
              {t('nav.swagger')}
            </a>
          </Button>
          <ThemeToggle />
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            {t('nav.logout')}
          </Button>
        </div>
      </header>

      <main className="row-start-2 overflow-y-auto px-4 py-6 md:col-start-2">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>

      <footer className="row-start-3 border-t border-border bg-card/40 px-4 py-3 text-center text-xs text-muted-foreground md:col-start-2">
        <span>WebAPP-Wago © 2026 · </span>
        <a
          className="underline decoration-dotted hover:text-brand"
          href={POWERED_BY_URL}
          target="_blank"
          rel="noreferrer"
        >
          {t('poweredBy')}
        </a>
      </footer>
    </div>
  )
}

function BrandHeader({ compact }: { compact?: boolean }) {
  const { t } = useTranslation()
  return (
    <div className={cn('flex items-center gap-2', compact ? 'text-base' : 'text-lg')}>
      <span className="inline-block h-3 w-3 rounded-full bg-brand shadow-[0_0_12px_var(--brand)]" />
      <span className="font-semibold tracking-tight text-foreground">
        {t('brand')}
      </span>
    </div>
  )
}
