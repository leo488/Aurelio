/** A note's text with "- " lines as bullets and "[ ]" / "[x]" as boxes. Cut after `lines` lines. */
export function NoteText({ body, lines }: { body: string; lines?: number }) {
  const all = body.split('\n').filter((l, i, a) => l.trim() || (i > 0 && a[i - 1].trim()))
  const shown = lines ? all.slice(0, lines) : all
  return (
    <div className="note-text">
      {shown.map((l, i) => {
        const m = l.match(/^\s*(?:[-*•]|\d+[.)])\s+(.*)$/)
        if (m) {
          const box = m[1].match(/^\[( |x|X)\]\s*(.*)$/)
          return (
            <div key={i} className="note-li">
              <span aria-hidden="true">{box ? (box[1] === ' ' ? '○' : '●') : '•'}</span>
              <span style={box && box[1] !== ' ' ? { textDecoration: 'line-through', color: 'var(--muted-4)' } : undefined}>{box ? box[2] : m[1]}</span>
            </div>
          )
        }
        return l.trim() ? <div key={i} className="note-p">{l}</div> : <div key={i} style={{ height: 6 }} />
      })}
      {lines && all.length > lines && <div className="note-p" style={{ color: 'var(--muted-3)' }}>…</div>}
    </div>
  )
}
