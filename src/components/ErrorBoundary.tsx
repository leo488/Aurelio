import { Component, type ReactNode } from 'react'

/** If a screen crashes, show a way back instead of a blank page. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: unknown) {
    console.error(error)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <main className="screen no-bar" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 16, padding: 32, textAlign: 'center' }}>
        <h1 className="display" style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Something went wrong</h1>
        <div style={{ fontSize: 14, color: 'var(--muted-2)' }}>Your data is safe. Reload to carry on.</div>
        <button type="button" onClick={() => window.location.reload()}
          style={{ padding: '14px 28px', borderRadius: 10, background: 'var(--ink)', color: 'var(--paper)', fontSize: 15, fontWeight: 800 }}>Reload</button>
      </main>
    )
  }
}
