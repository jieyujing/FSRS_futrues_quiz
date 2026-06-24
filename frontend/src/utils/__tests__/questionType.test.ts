import { describe, it, expect } from 'vitest'
import { isMultiChoice } from '../questionType'

describe('isMultiChoice', () => {
  it('returns false for single-choice questions (单选题)', () => {
    expect(isMultiChoice('单选题')).toBe(false)
  })

  it('returns true for multi-select questions (多选题)', () => {
    expect(isMultiChoice('多选题')).toBe(true)
  })

  it('returns false for true/false questions (判断题)', () => {
    expect(isMultiChoice('判断题')).toBe(false)
  })

  it('returns true for comprehensive questions (综合题)', () => {
    expect(isMultiChoice('综合题')).toBe(true)
  })

  it('returns false for indefinite-choice questions (不定项) — no longer matches old behavior', () => {
    expect(isMultiChoice('不定项')).toBe(false)
  })

  it('returns true for bare "多选" — backward compat if old data slips through', () => {
    expect(isMultiChoice('多选')).toBe(true)
  })

  it('returns true for bare "综合" — backward compat', () => {
    expect(isMultiChoice('综合')).toBe(true)
  })

  it('returns false for empty string', () => {
    expect(isMultiChoice('')).toBe(false)
  })

  it('returns false for "单选" (single-select without 题)', () => {
    expect(isMultiChoice('单选')).toBe(false)
  })
})
