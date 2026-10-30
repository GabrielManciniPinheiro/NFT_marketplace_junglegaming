import { describe, expect, it } from 'vitest'
import { eth, formatEth, fromWei, toWei } from './eth'

describe('eth arithmetic', () => {
  it('round-trips decimal strings through wei without precision loss', () => {
    expect(fromWei(toWei('1.19'))).toBe('1.19')
    expect(fromWei(toWei('0.000000000000000001'))).toBe('0.000000000000000001')
    expect(fromWei(toWei('26.830'))).toBe('26.83')
  })

  it('reproduces the Figma cart totals exactly', () => {
    const lines = [eth.mul('1.19', 2), eth.mul('1.39', 6), eth.mul('1.79', 9)]
    expect(lines).toEqual(['2.38', '8.34', '16.11'])
    const subtotal = eth.add(...lines)
    expect(subtotal).toBe('26.83')
    expect(eth.add(subtotal, '0.016')).toBe('26.846')
  })

  it('avoids floating point drift that Number would introduce', () => {
    expect(0.1 + 0.2).not.toBe(0.3)
    expect(eth.add('0.1', '0.2')).toBe('0.3')
  })

  it('applies basis-point discounts rounding down to the wei', () => {
    expect(eth.bps('26.83', 1000)).toBe('2.683')
    expect(eth.bps('0.000000000000000003', 5000)).toBe('0.000000000000000001')
  })

  it('clamps subtraction at zero and compares values', () => {
    expect(eth.sub('1', '2')).toBe('0')
    expect(eth.cmp('1.10', '1.1')).toBe(0)
    expect(eth.cmp('2', '10')).toBe(-1)
  })

  it('rejects invalid amounts and fractional quantities', () => {
    expect(() => toWei('1,19')).toThrow(RangeError)
    expect(() => toWei('-1')).toThrow(RangeError)
    expect(() => eth.mul('1', 1.5)).toThrow(RangeError)
  })
})

describe('formatEth', () => {
  it('keeps two decimals minimum like the layout', () => {
    expect(formatEth('2')).toBe('2.00')
    expect(formatEth('1.19')).toBe('1.19')
    expect(formatEth('0.016')).toBe('0.016')
    expect(formatEth('26.846')).toBe('26.846')
  })

  it('rounds half-up past the maximum fraction digits', () => {
    expect(formatEth('0.0000005')).toBe('0.000001')
    expect(formatEth('1.23456749', { maxFractionDigits: 4 })).toBe('1.2346')
  })
})
