import { Currency } from './currency'
import { amountAsMinorUnits } from './utils'

/**
 * Conversion rates are always expressed as "1 original currency = `rate` group currency",
 * matching how `useCurrencyRate` queries the API (the original currency is the base).
 */
function isUsableRate(rate: number) {
  return Number.isFinite(rate) && rate > 0
}

/**
 * Converts an amount given in the expense's original currency into the group currency.
 * This is the direction used for regular expenses: the user enters what they actually
 * spent abroad, and the group-currency amount follows.
 *
 * @returns the converted amount as a string with the group currency's decimal digits,
 * or `null` if the inputs cannot produce a meaningful result.
 */
export function convertToGroupCurrency(
  originalAmount: number,
  rate: number,
  groupCurrency: Currency,
): string | null {
  if (!Number.isFinite(originalAmount) || !isUsableRate(rate)) return null
  const converted = originalAmount * rate
  if (!Number.isFinite(converted)) return null
  return converted.toFixed(groupCurrency.decimal_digits)
}

/**
 * Converts an amount given in the group currency into the expense's original currency.
 * This is the direction used for repayments: the group-currency amount is fixed by the
 * balance being settled, and the amount to actually transfer follows.
 *
 * The result is rounded to the original currency's decimal digits, so converting it back
 * will not always yield the exact group-currency amount. That is intentional: the
 * group-currency amount stays the authoritative figure, and the original amount is only
 * recorded for reference.
 *
 * @returns the converted amount as a string with the original currency's decimal digits,
 * or `null` if the inputs cannot produce a meaningful result.
 */
export function convertToOriginalCurrency(
  groupAmount: number,
  rate: number,
  originalCurrency: Currency,
): string | null {
  if (!Number.isFinite(groupAmount) || !isUsableRate(rate)) return null
  const converted = groupAmount / rate
  if (!Number.isFinite(converted)) return null
  return converted.toFixed(originalCurrency.decimal_digits)
}

/** Accepts Czech comma decimals ("24,33") and spaces. */
export function parseLocaleDecimal(value: string): number | null {
  const normalized = value.trim().replace(/\s/g, '').replace(',', '.')
  if (!/^\d*\.?\d+$/.test(normalized)) return null
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

/**
 * Rate to store: a typed rate wins, otherwise the fetched ECB rate.
 * Both are "1 original currency = `rate` group currency".
 */
export function resolveConversionRate(
  customText: string,
  fetched: number | undefined,
): number | null {
  const custom = parseLocaleDecimal(customText)
  if (custom != null && custom > 0) return custom
  if (fetched != null && Number.isFinite(fetched) && fetched > 0) return fetched
  return null
}

export type GroupCurrencyAmounts = {
  /** Minor units of the group currency. Balances, totals and budgets use this. */
  amount: number
  originalAmount?: number
  originalCurrency?: string
  conversionRate?: number
}

/**
 * Turns an amount typed in `entered` into the minor units stored on an expense.
 * The same currency (or a group with no ISO code) stores only `amount`, so
 * existing group-currency expenses stay unchanged. A foreign currency also
 * stores the original minor units, the code and the rate.
 */
export function amountsForGroupCurrency(input: {
  enteredMajor: number
  entered: Currency
  group: Currency
  rate: number | null
}): GroupCurrencyAmounts | null {
  const { enteredMajor, entered, group, rate } = input
  if (!Number.isFinite(enteredMajor) || enteredMajor <= 0) return null

  const foreign = !!entered.code && !!group.code && entered.code !== group.code
  if (!foreign) {
    const amount = amountAsMinorUnits(
      enteredMajor,
      group.code ? group : entered,
    )
    return amount > 0 ? { amount } : null
  }

  if (rate == null || !isUsableRate(rate)) return null
  const converted = convertToGroupCurrency(enteredMajor, rate, group)
  if (converted == null) return null
  const amount = amountAsMinorUnits(Number(converted), group)
  const originalAmount = amountAsMinorUnits(enteredMajor, entered)
  if (amount === 0 || originalAmount === 0) return null
  return {
    amount,
    originalAmount,
    originalCurrency: entered.code,
    conversionRate: rate,
  }
}
