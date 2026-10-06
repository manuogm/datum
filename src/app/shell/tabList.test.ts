import { describe, expect, it } from 'vitest'
import { parseTabs, tabAfterClosing, withoutTab, withTab } from './tabList'

describe('tab list', () => {
  it('opens a tab at the right end, once', () => {
    expect(withTab(['a'], 'b')).toEqual(['a', 'b'])
    const tabs = ['a', 'b']
    expect(withTab(tabs, 'a')).toBe(tabs)
  })

  it('closes a tab', () => {
    expect(withoutTab(['a', 'b', 'c'], 'b')).toEqual(['a', 'c'])
    expect(withoutTab(['a'], 'x')).toEqual(['a'])
  })

  it('shows the right neighbour after closing, else the left one, else Home', () => {
    expect(tabAfterClosing(['a', 'b', 'c'], 'b')).toBe('c')
    expect(tabAfterClosing(['a', 'b', 'c'], 'c')).toBe('b')
    expect(tabAfterClosing(['a'], 'a')).toBeNull()
    expect(tabAfterClosing(['a'], 'x')).toBeNull()
  })

  it('reads stored tabs, dropping anything malformed', () => {
    expect(parseTabs('["a","b","a",3]')).toEqual(['a', 'b'])
    expect(parseTabs(null)).toEqual([])
    expect(parseTabs('{"a":1}')).toEqual([])
    expect(parseTabs('not json')).toEqual([])
  })
})
