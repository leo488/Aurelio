import { useCallback, useEffect, useRef, useState } from 'react'
import { haptic } from './haptics'

/**
 * What is being dragged: a card, or one step inside a card. `index` is where it sits now, in `list`
 * when a page has several lists of cards (the week's morning, day and evening).
 */
export type DragItem = { kind: 'goal'; id: string; index: number; list?: string } | { kind: 'step'; id: string; goalId: string; index: number }

/**
 * Where it would land: inside a goal (as a step), between goals (as a goal), or between steps.
 * Indexes are insertion points in the list as it is now, dragged item included.
 */
export type DropTarget =
  | { kind: 'nest'; goalId: string; index?: number }
  | { kind: 'goal-at'; index: number; list?: string }
  | { kind: 'step-at'; goalId: string; index: number }

export type DragState = { item: DragItem; dx: number; dy: number; target: DropTarget | null }

const HOLD_MS = 280
const SLOP = 8
const EDGE = 0.28

/**
 * Read the drop zone under a point from the `data-dz` attributes the week page puts on cards and steps.
 * Only zones inside this drag's `data-drag-scope` count, so two lists on a page don't mix.
 */
function hitTest(x: number, y: number, item: DragItem, scope: string): DropTarget | null {
  const el = document.elementsFromPoint(x, y).find((e) => (e as HTMLElement).dataset?.dz && (e.closest('[data-drag-scope]') as HTMLElement | null)?.dataset.dragScope === scope) as HTMLElement | undefined
  if (!el) return null
  const { dz, goal = '', index: rawIndex = '0', list } = el.dataset
  const index = Number(rawIndex)
  const same = item.kind === 'goal' && item.list === list
  // The empty space after a list's last card.
  if (dz === 'end') return same && item.kind === 'goal' && (index === item.index || index === item.index + 1) ? null : { kind: 'goal-at', index, list }
  const rect = el.getBoundingClientRect()
  const rel = (y - rect.top) / rect.height

  if (dz === 'step') {
    const at = rel < 0.5 ? index : index + 1
    if (item.kind === 'goal') return item.id === goal ? null : { kind: 'nest', goalId: goal, index: at }
    if (goal === item.goalId && (at === item.index || at === item.index + 1)) return null
    return { kind: 'step-at', goalId: goal, index: at }
  }
  if (dz !== 'goal') return null
  if (rel < EDGE || rel > 1 - EDGE) {
    const at = rel < EDGE ? index : index + 1
    if (item.kind === 'goal' && (item.id === goal || (same && (at === item.index || at === item.index + 1)))) return null
    return { kind: 'goal-at', index: at, list }
  }
  if (item.kind === 'goal') return item.id === goal ? null : { kind: 'nest', goalId: goal }
  if (goal === item.goalId) return null
  return { kind: 'step-at', goalId: goal, index: Number(el.dataset.steps ?? 0) }
}

/**
 * Drag to reorder and nest. Touch picks an item up after a short hold (so the page still scrolls),
 * the mouse after a small move. While dragging the page scrolls near the top and bottom edges.
 */
export function useDrag(onDrop: (item: DragItem, target: DropTarget) => void, scope = 'goals') {
  const [state, setState] = useState<DragState | null>(null)
  const live = useRef<{ item: DragItem; x0: number; y0: number; s0: number; x: number; y: number; active: boolean; timer?: number; raf?: number } | null>(null)
  const drop = useRef(onDrop)
  useEffect(() => {
    drop.current = onDrop
  })

  const render = useCallback(() => {
    const l = live.current
    if (!l?.active) return
    setState({ item: l.item, dx: l.x - l.x0, dy: l.y - l.y0 + (window.scrollY - l.s0), target: hitTest(l.x, l.y, l.item, scope) })
  }, [scope])

  const stop = useCallback((commit: boolean) => {
    const l = live.current
    live.current = null
    if (!l) return
    clearTimeout(l.timer)
    if (l.raf) cancelAnimationFrame(l.raf)
    if (!l.active) return
    const target = commit ? hitTest(l.x, l.y, l.item, scope) : null
    setState(null)
    // The release would also count as a tap on whatever is under it.
    const swallow = (e: Event) => { e.preventDefault(); e.stopPropagation() }
    window.addEventListener('click', swallow, { capture: true, once: true })
    setTimeout(() => window.removeEventListener('click', swallow, { capture: true }), 350)
    if (target) drop.current(l.item, target)
  }, [scope])

  const activate = useCallback(() => {
    const l = live.current
    if (!l || l.active) return
    l.active = true
    haptic(10)
    const scroll = () => {
      const c = live.current
      if (!c?.active) return
      // Only once the item has been carried towards an edge, so picking one up near the bar doesn't scroll.
      const speed = c.y < 90 && c.y < c.y0 - 24 ? -9 : c.y > window.innerHeight - 120 && c.y > c.y0 + 24 ? 9 : 0
      if (speed) {
        window.scrollBy(0, speed)
        render()
      }
      c.raf = requestAnimationFrame(scroll)
    }
    l.raf = requestAnimationFrame(scroll)
    render()
  }, [render])

  const move = useCallback((x: number, y: number) => {
    const l = live.current
    if (!l) return false
    l.x = x
    l.y = y
    const far = Math.hypot(x - l.x0, y - l.y0) > SLOP
    if (!l.active && far) {
      // A touch that moves before the hold is a scroll; a mouse that moves is a drag.
      if (l.timer !== undefined) stop(false)
      else activate()
    }
    if (l.active) render()
    return l.active
  }, [activate, render, stop])

  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => e.pointerType !== 'touch' && move(e.clientX, e.clientY)
    const onPointerUp = (e: PointerEvent) => e.pointerType !== 'touch' && stop(true)
    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0]
      if (t && move(t.clientX, t.clientY) && e.cancelable) e.preventDefault()
    }
    const onTouchEnd = () => stop(true)
    const onCancel = () => stop(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && stop(false)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('touchend', onTouchEnd)
    window.addEventListener('touchcancel', onCancel)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
      window.removeEventListener('touchcancel', onCancel)
      window.removeEventListener('keydown', onKey)
      stop(false)
    }
  }, [move, stop])

  /** Spread onto the element that picks the item up. Typing fields inside it never start a drag. */
  const bind = (item: DragItem, opts: { immediate?: boolean } = {}) => ({
    onPointerDown: (e: React.PointerEvent) => {
      if (e.pointerType === 'touch' || e.button !== 0 || (e.target as HTMLElement).closest('input, textarea, select')) return
      e.stopPropagation()
      live.current = { item, x0: e.clientX, y0: e.clientY, s0: window.scrollY, x: e.clientX, y: e.clientY, active: false }
      if (opts.immediate) activate()
    },
    onTouchStart: (e: React.TouchEvent) => {
      const t = e.touches[0]
      if (!t || e.touches.length > 1 || (e.target as HTMLElement).closest('input, textarea, select')) return
      e.stopPropagation()
      live.current = { item, x0: t.clientX, y0: t.clientY, s0: window.scrollY, x: t.clientX, y: t.clientY, active: false }
      if (opts.immediate) activate()
      else live.current.timer = window.setTimeout(activate, HOLD_MS)
    },
    onContextMenu: (e: React.MouseEvent) => live.current && e.preventDefault(),
  })

  return { drag: state, bind }
}
