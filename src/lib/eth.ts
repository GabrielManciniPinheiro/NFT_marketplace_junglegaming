/**
 * Exact ETH arithmetic.
 *
 * Amounts travel as decimal strings ("1.19", "0.016") and are converted to wei (bigint,
 * 18 decimals) for every calculation, so sums, quantities and discounts never go
 * through floating point. Quantities are integers by contract.
 */

export const ETH_DECIMALS = 18
const SCALE = 10n ** BigInt(ETH_DECIMALS)
const ETH_PATTERN = /^(\d+)(?:\.(\d{1,18}))?$/

export function isEthAmount(value: string): boolean {
  return ETH_PATTERN.test(value)
}

export function toWei(value: string): bigint {
  const match = ETH_PATTERN.exec(value.trim())
  if (!match) throw new RangeError(`Valor em ETH inválido: "${value}"`)
  const [, integer = '0', fraction = ''] = match
  return BigInt(integer) * SCALE + BigInt(fraction.padEnd(ETH_DECIMALS, '0'))
}

/** Canonical decimal string: no trailing zeros, no exponent ("26.846", "2.38", "0"). */
export function fromWei(wei: bigint): string {
  const negative = wei < 0n
  const abs = negative ? -wei : wei
  const integer = abs / SCALE
  const fraction = (abs % SCALE).toString().padStart(ETH_DECIMALS, '0').replace(/0+$/, '')
  return `${negative ? '-' : ''}${integer}${fraction ? `.${fraction}` : ''}`
}

function assertQuantity(quantity: number) {
  if (!Number.isSafeInteger(quantity) || quantity < 0) {
    throw new RangeError(`Quantidade inválida: ${quantity}`)
  }
}

export const eth = {
  add: (...values: string[]): string => fromWei(values.reduce((acc, v) => acc + toWei(v), 0n)),

  /** a - b, clamped at zero (amounts are never negative in this domain). */
  sub: (a: string, b: string): string => {
    const result = toWei(a) - toWei(b)
    return fromWei(result < 0n ? 0n : result)
  },

  mul: (value: string, quantity: number): string => {
    assertQuantity(quantity)
    return fromWei(toWei(value) * BigInt(quantity))
  },

  /** Applies basis points (1000 = 10%), rounding down to the wei. */
  bps: (value: string, basisPoints: number): string => {
    assertQuantity(basisPoints)
    return fromWei((toWei(value) * BigInt(basisPoints)) / 10_000n)
  },

  cmp: (a: string, b: string): -1 | 0 | 1 => {
    const x = toWei(a)
    const y = toWei(b)
    return x < y ? -1 : x > y ? 1 : 0
  },

  eq: (a: string, b: string): boolean => toWei(a) === toWei(b),

  min: (a: string, b: string): string => (toWei(a) <= toWei(b) ? a : b),

  isZero: (value: string): boolean => toWei(value) === 0n,

  normalize: (value: string): string => fromWei(toWei(value)),
}

export interface FormatEthOptions {
  minFractionDigits?: number
  maxFractionDigits?: number
}

/**
 * Display formatting: keeps at least `minFractionDigits` (Figma shows "1.19", "0.016",
 * "26.846") and rounds half-up beyond `maxFractionDigits`.
 */
export function formatEth(
  value: string,
  { minFractionDigits = 2, maxFractionDigits = 6 }: FormatEthOptions = {},
): string {
  const unit = 10n ** BigInt(ETH_DECIMALS - maxFractionDigits)
  const rounded = ((toWei(value) + unit / 2n) / unit) * unit
  const [integer, fraction = ''] = fromWei(rounded).split('.')
  const padded = fraction.padEnd(minFractionDigits, '0')
  return padded ? `${integer}.${padded}` : `${integer}`
}

/** Approximate number, only for non-monetary UI (slider positions, charts). */
export function ethToNumber(value: string): number {
  return Number(value)
}
