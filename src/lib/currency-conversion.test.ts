import { getCurrency } from './currency'
import {
  amountsForGroupCurrency,
  convertToGroupCurrency,
  convertToOriginalCurrency,
  parseLocaleDecimal,
  resolveConversionRate,
} from './currency-conversion'

const EUR = getCurrency('EUR')
const THB = getCurrency('THB')
/** Has no minor units in practice */
const JPY = getCurrency('JPY')

describe('convertToGroupCurrency', () => {
  it('converts using the rate and rounds to the group currency', () => {
    // 1 EUR = 38.4 THB
    expect(convertToGroupCurrency(130.21, 38.4, THB)).toBe('5000.06')
  })

  it('rounds to the group currency decimal digits', () => {
    expect(convertToGroupCurrency(10, 163.456, JPY)).toBe('1635')
  })

  it('supports negative amounts (income)', () => {
    expect(convertToGroupCurrency(-10, 38.4, THB)).toBe('-384.00')
  })

  it.each([0, -1, NaN, Infinity])('rejects the rate %p', (rate) => {
    expect(convertToGroupCurrency(100, rate, THB)).toBeNull()
  })

  it('rejects a non-numeric amount', () => {
    expect(convertToGroupCurrency(NaN, 38.4, THB)).toBeNull()
  })
})

describe('convertToOriginalCurrency', () => {
  it('converts back and rounds to the original currency', () => {
    // Settling ฿5,000 at 1 EUR = 38.4 THB
    expect(convertToOriginalCurrency(5000, 38.4, EUR)).toBe('130.21')
  })

  it('rounds to the original currency decimal digits', () => {
    // 1 JPY = 0.0064 EUR
    expect(convertToOriginalCurrency(100, 0.0064, JPY)).toBe('15625')
  })

  it.each([0, -1, NaN, Infinity])('rejects the rate %p', (rate) => {
    expect(convertToOriginalCurrency(100, rate, EUR)).toBeNull()
  })

  it('rejects a non-numeric amount', () => {
    expect(convertToOriginalCurrency(NaN, 38.4, EUR)).toBeNull()
  })
})

describe('amountsForGroupCurrency', () => {
  const CZK = getCurrency('CZK', 'cs-CZ')
  const EUR = getCurrency('EUR', 'cs-CZ')
  const LKR = getCurrency('LKR', 'cs-CZ')
  const MVR = getCurrency('MVR', 'cs-CZ')

  it('knows the currencies the group actually spends', () => {
    expect(CZK.code).toBe('CZK')
    expect(EUR.symbol).toBe('€')
    expect(LKR.code).toBe('LKR')
    expect(MVR.name).toBe('maledivská rufiyaa')
    expect(getCurrency('PHP', 'cs-CZ').code).toBe('PHP')
    expect(getCurrency('CHF', 'cs-CZ').code).toBe('CHF')
  })

  it('stores a group-currency amount with no original fields', () => {
    expect(
      amountsForGroupCurrency({
        enteredMajor: 120.5,
        entered: CZK,
        group: CZK,
        rate: 99,
      }),
    ).toEqual({ amount: 12050 })
  })

  it('converts a foreign amount into group-currency minor units and keeps the rate', () => {
    // 100 EUR * 24.329 = 2432.90 CZK
    expect(
      amountsForGroupCurrency({
        enteredMajor: 100,
        entered: EUR,
        group: CZK,
        rate: 24.329,
      }),
    ).toEqual({
      amount: 243290,
      originalAmount: 10000,
      originalCurrency: 'EUR',
      conversionRate: 24.329,
    })
  })

  it('refuses a foreign amount until a positive rate exists', () => {
    expect(
      amountsForGroupCurrency({
        enteredMajor: 50,
        entered: LKR,
        group: CZK,
        rate: null,
      }),
    ).toBeNull()
    expect(parseLocaleDecimal('24,50')).toBe(24.5)
    expect(parseLocaleDecimal('1 234,5')).toBe(1234.5)
    expect(resolveConversionRate('', undefined)).toBeNull()
    expect(resolveConversionRate('0,15', undefined)).toBe(0.15)
    expect(resolveConversionRate('', 24.329)).toBe(24.329)
    expect(resolveConversionRate('25', 24.329)).toBe(25)
  })
})

describe('round trip', () => {
  /**
   * The original amount is rounded to its own currency, so converting it back does not
   * always yield the exact group amount. The drift must stay below one minor unit of the
   * original currency expressed in the group currency.
   */
  it.each([
    [5000, 38.4],
    [1234.56, 0.87],
    [99.99, 1.0921],
    [1, 145.3],
  ])('stays within one minor unit for %p at rate %p', (groupAmount, rate) => {
    const original = convertToOriginalCurrency(groupAmount, rate, EUR)
    expect(original).not.toBeNull()
    const roundTripped = convertToGroupCurrency(Number(original), rate, THB)
    expect(roundTripped).not.toBeNull()
    const drift = Math.abs(Number(roundTripped) - groupAmount)
    expect(drift).toBeLessThanOrEqual(
      (rate / 10 ** EUR.decimal_digits / 2) * 1.000001,
    )
  })
})
