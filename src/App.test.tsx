import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { expect, test } from 'vitest'
import App from './App'

test('picking a profile goes to Today', () => {
  render(
    <MemoryRouter>
      <App />
    </MemoryRouter>,
  )
  expect(screen.getByText('Who are you today?')).toBeTruthy()
  fireEvent.click(screen.getByText('Soniya'))
  expect(screen.getByRole('heading', { name: 'Today' })).toBeTruthy()
})
