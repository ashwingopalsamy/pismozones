import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { AnimatedPlaceholder } from './AnimatedPlaceholder'

describe('AnimatedPlaceholder', () => {
  it('renders overlay when value is empty string', () => {
    render(<AnimatedPlaceholder value="" />)
    const overlay = document.querySelector('[aria-hidden="true"]')
    expect(overlay).not.toBeNull()
  })

  it('returns null when value is non-empty', () => {
    const { container } = render(<AnimatedPlaceholder value="9am BRT" />)
    expect(container.firstChild).toBeNull()
  })

  it('renders time span with nl-ph__time class', () => {
    render(<AnimatedPlaceholder value="" />)
    expect(document.querySelector('.nl-ph__time')).not.toBeNull()
  })

  it('renders destination span with nl-ph__dest class', () => {
    render(<AnimatedPlaceholder value="" />)
    expect(document.querySelector('.nl-ph__dest')).not.toBeNull()
  })
})
