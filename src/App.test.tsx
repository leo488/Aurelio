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
  expect(screen.getByRole('heading', { name: /Who are you/ })).toBeTruthy()
  fireEvent.click(screen.getByText('Soniya'))
  expect(screen.getByText(/, Soniya$/)).toBeTruthy()
})
