import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center bg-background">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-brand">404</h1>
        <p className="mt-2 text-muted-foreground">Página no encontrada</p>
        <Button asChild className="mt-6">
          <Link to="/dashboard">Volver al dashboard</Link>
        </Button>
      </div>
    </div>
  )
}
