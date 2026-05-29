import { describe, it, expect } from 'vitest'
import { parseNaturalTimeQuery, VIRTUAL_SOURCES } from './naturalTimeParser.js'
import { CITIES } from '../hooks/useTimeConversion.js'

const ctx = {
  sourceDateTime: null,
  sourceId: 'saopaulo',
  activeCityIds: ['saopaulo', 'austin', 'bristol', 'bangalore'],
}

describe('CET → Warsaw alias', () => {
  it('resolves "9am CET to IST" — source is Warsaw', () => {
    const result = parseNaturalTimeQuery('9am CET to IST', ctx)
    expect(result.status).toBe('ready')
    expect(result.sourceCity.id).toBe('warsaw')
  })

  it('resolves "10am CEST to BRT" — source is Warsaw', () => {
    const result = parseNaturalTimeQuery('10am CEST to BRT', ctx)
    expect(result.status).toBe('ready')
    expect(result.sourceCity.id).toBe('warsaw')
  })

  it('resolves "9am to CET" — destination includes Warsaw', () => {
    const result = parseNaturalTimeQuery('9am to CET', ctx)
    expect(result.status).toBe('ready')
    expect(result.destinationIds).toContain('warsaw')
  })
})

describe('UTC virtual source', () => {
  it('resolves "14:00 UTC to Warsaw" — source is UTC virtual city', () => {
    const result = parseNaturalTimeQuery('14:00 UTC to Warsaw', ctx)
    expect(result.status).toBe('ready')
    expect(result.sourceCity.id).toBe('utc')
    expect(result.sourceCity.timezone).toBe('UTC')
  })

  it("resolves '9am UTC to IST' — destination is Bangalore", () => {
    const result = parseNaturalTimeQuery('9am UTC to IST', ctx)
    expect(result.status).toBe('ready')
    expect(result.sourceCity.id).toBe('utc')
    expect(result.destinationIds).toContain('bangalore')
  })

  it('resolves "9am BRT to UTC" — UTC appears in destinationIds', () => {
    const result = parseNaturalTimeQuery('9am BRT to UTC', ctx)
    expect(result.status).toBe('ready')
    expect(result.destinationIds).toContain('utc')
  })

  it('does not treat UTC as unsupported zone', () => {
    const result = parseNaturalTimeQuery('14:00 UTC to Warsaw', ctx)
    expect(result.status).not.toBe('unsupported')
  })

  it('exports VIRTUAL_SOURCES with utc entry', () => {
    expect(VIRTUAL_SOURCES.has('utc')).toBe(true)
    expect(VIRTUAL_SOURCES.get('utc').timezone).toBe('UTC')
    expect(VIRTUAL_SOURCES.get('utc').country).toBeNull()
  })
})

describe('VIRTUAL_SOURCES contract', () => {
  it('no ID collision between VIRTUAL_SOURCES and CITIES', () => {
    const cityIds = new Set(CITIES.map(c => c.id))
    for (const [id] of VIRTUAL_SOURCES) {
      expect(cityIds.has(id)).toBe(false)
    }
  })
})
