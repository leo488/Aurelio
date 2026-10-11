import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeAll, describe, expect, test } from 'vitest'
import App from './App'
import { boot } from './boot'
import { useAuth } from './data/session'
import { useData } from './data/store'
import { getAuth } from './services'

const pressPin = (pin: string) => pin.split('').forEach((d) => fireEvent.click(screen.getByRole('button', { name: d })))

async function firstLogin(name: 'Leo' | 'Sonia', pin: string) {
  fireEvent.click(await screen.findByText(name))
  fireEvent.click(await screen.findByRole('button', { name: 'Email me a code' }))
  fireEvent.change(await screen.findByLabelText('Code from the email'), { target: { value: '123456' } })
  fireEvent.click(screen.getByRole('button', { name: 'Verify' }))
  await screen.findByText('Create a 4-digit PIN')
  pressPin(pin)
  await screen.findByText('Confirm your PIN')
  pressPin(pin)
}

async function lock() {
  await act(async () => {
    await getAuth().signOut()
    useAuth.getState().setSession(null)
    useData.getState().clear()
  })
}

const renderApp = (path = '/') => render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>)

describe('two people, two experiences', () => {
  beforeAll(async () => {
    localStorage.clear()
    sessionStorage.clear()
    await boot()
  })

  test('nobody’s data shows before sign-in', () => {
    const { unmount } = renderApp()
    expect(screen.getByRole('heading', { name: /Who are you/ })).toBeTruthy()
    expect(screen.queryByText(/finished/)).toBeNull()
    expect(screen.queryByText(/streak/i)).toBeNull()
    unmount()
  })

  test('Leo: first login with email code and a new PIN lands on routines', async () => {
    const { unmount } = renderApp()
    await firstLogin('Leo', '2468')
    await screen.findByText(/routines done/)
    expect(screen.getByText('Morning Routine')).toBeTruthy()
    expect(screen.queryByText('Team meeting')).toBeNull()
    expect(screen.getByRole('link', { name: 'Routines' })).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Calendar' })).toBeNull()
    unmount()
    await lock()
  })

  test('Sonia: first login lands on her planner, never Leo’s routines', async () => {
    const { unmount } = renderApp()
    fireEvent.click(await screen.findByRole('button', { name: 'Back' }))
    await firstLogin('Sonia', '1357')
    await screen.findByText(/tasks today/)
    expect(screen.getByText('Send proposal')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Upcoming' })).toBeTruthy()
    expect(screen.queryByText('Morning Routine')).toBeNull()
    expect(screen.getByRole('link', { name: 'Calendar' })).toBeTruthy()
    unmount()
    await lock()
  })

  test('returning: straight to the PIN for the last profile; a wrong PIN is refused', async () => {
    const { unmount } = renderApp()
    await screen.findByText('Hi Sonia.')
    pressPin('0000')
    await screen.findByText('That’s not it. Try again.')
    pressPin('1357')
    await screen.findByText(/tasks today/)
    unmount()
    await lock()
  })

  test('Sonia can’t open Leo’s screens by URL', async () => {
    await act(async () => {
      const s = await getAuth().signInWithPin('sonia', '1357')
      useAuth.getState().setSession(s)
      await useData.getState().load(s.user)
    })
    const { unmount } = renderApp('/routines')
    await waitFor(() => expect(screen.getByText(/tasks today/)).toBeTruthy())
    unmount()
    await lock()
  })

  test('quick add puts a task on Sonia’s plan without leaving Today', async () => {
    await act(async () => {
      const s = await getAuth().signInWithPin('sonia', '1357')
      useAuth.getState().setSession(s)
      await useData.getState().load(s.user)
    })
    const { unmount } = renderApp('/today')
    const input = await screen.findByLabelText('Add a task for today')
    fireEvent.change(input, { target: { value: 'Pick up flowers 17:15' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    await screen.findByText('Pick up flowers')
    expect(useData.getState().tasks.find((t) => t.title === 'Pick up flowers')?.startTime).toBe('17:15')
    unmount()
    await lock()
  })
})
