import { describe, it, expect } from 'vitest'
import { normalizedLevenshtein, findSimilarStrings } from './similarity'

describe('normalizedLevenshtein', () => {
  it('returns 1 for identical strings ignoring case/whitespace', () => {
    expect(normalizedLevenshtein('Room 101', ' room 101 ')).toBe(1)
  })

  it('returns a low score for very different strings', () => {
    expect(normalizedLevenshtein('Room 101', 'Pool Area')).toBeLessThan(0.5)
  })
})

describe('findSimilarStrings', () => {
  it('flags near-duplicate names above the threshold', () => {
    const result = findSimilarStrings('Room 101', ['room 101', 'Pool Area'])
    expect(result).toEqual(['room 101'])
  })

  it('excludes an exact case-insensitive match from results', () => {
    const result = findSimilarStrings('room 101', ['Room 101'])
    expect(result).toEqual(['Room 101'])
  })

  it('returns empty array when nothing is similar', () => {
    const result = findSimilarStrings('Lobby', ['Pool Area', 'Room 101'])
    expect(result).toEqual([])
  })
})
