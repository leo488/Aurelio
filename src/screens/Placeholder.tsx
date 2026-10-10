import { Link } from 'react-router-dom'

export function Placeholder({ title }: { title: string }) {
  return (
    <main className="screen">
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 700, letterSpacing: '-0.03em', margin: 0 }}>{title}</h1>
      <p style={{ color: 'var(--muted-1)' }}>Not built yet.</p>
      <Link to="/" style={{ color: 'var(--gold-text)', fontWeight: 700 }}>Switch profile</Link>
    </main>
  )
}
