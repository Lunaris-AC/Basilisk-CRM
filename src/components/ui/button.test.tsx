import { render, screen } from '@testing-library/react'
import { Button } from './button'
import { expect, test } from 'vitest'

test('renders button with text', () => {
  render(<Button>Click me</Button>)
  expect(screen.getByText('Click me')).toBeDefined()
})

test('applies variant classes', () => {
  const { container } = render(<Button variant="destructive">Delete</Button>)
  expect(container.firstChild).toHaveClass('bg-destructive')
})
