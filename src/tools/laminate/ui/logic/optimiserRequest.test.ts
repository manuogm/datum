import { describe, expect, it } from 'vitest'
import { expectError, expectOk } from '../../../../core/testing'
import { DEFAULT_LAMINATE_INPUTS } from '../state/lamInputs'
import { DEFAULT_OPTIMISER_SETTINGS, directionLabel, optimiseRequest } from './optimiserRequest'

describe('optimiseRequest', () => {
  it('asks for the top ply material, ±θ pairs and the target on screen', () => {
    const request = expectOk(optimiseRequest({ ...DEFAULT_LAMINATE_INPUTS, targetReserveFactor: 2 }, { directions: [90, 30, 0], maxPlies: 24 }))
    expect(request).toMatchObject({ anglesDeg: [0, 30, -30, 90], targetReserveFactor: 2, maxPlies: 24, criterion: 'tsai-wu' })
    expect(request.material.id).toBe('cfrp-t700-m21-ud')
  })

  it('needs at least one direction', () => {
    expect(expectError(optimiseRequest(DEFAULT_LAMINATE_INPUTS, { ...DEFAULT_OPTIMISER_SETTINGS, directions: [] }))).toMatch(/direction/)
  })

  it('labels the pairs', () => {
    expect([0, 45, 90].map(directionLabel)).toEqual(['0°', '±45°', '90°'])
  })
})
