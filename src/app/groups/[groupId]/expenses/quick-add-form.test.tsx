import { QuickAddForm } from '@/app/groups/[groupId]/expenses/quick-add-form'
import '@testing-library/jest-dom'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

const mockMutateAsync = jest.fn().mockResolvedValue({})
const mockPush = jest.fn()

jest.mock('../../../../lib/random', () => ({
  randomId: () => 'exp1',
}))

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

jest.mock('next-intl', () => ({
  useLocale: () => 'cs-CZ',
  useTranslations: (namespace: string) => {
    const messages = require('../../../../../messages/cs-CZ.json')[namespace]
    const t = (key: string, values: Record<string, string | number> = {}) =>
      String(messages[key] ?? key).replace(/\{(\w+)\}/g, (_, name) =>
        String(values[name] ?? ''),
      )
    t.has = (key: string) => key in messages
    return t
  },
}))

jest.mock('../../../../trpc/client', () => ({
  trpc: {
    useUtils: () => ({ groups: { invalidate: jest.fn() } }),
    groups: {
      get: {
        useQuery: () => ({
          data: {
            group: {
              id: 'g1',
              name: 'Domácnost',
              currency: 'Kč',
              currencyCode: 'CZK',
              participants: [
                { id: 'a', name: 'Jana' },
                { id: 'b', name: 'Petr' },
              ],
            },
          },
        }),
      },
      expenses: {
        create: {
          useMutation: () => ({
            mutateAsync: mockMutateAsync,
            isPending: false,
          }),
        },
      },
    },
    categories: {
      list: { useQuery: () => ({ data: { categories: [] } }) },
    },
  },
}))

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  })
})

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('g1-activeUser', 'a')
  mockMutateAsync.mockClear()
  mockPush.mockClear()
  global.fetch = jest.fn(async (url: string) => {
    const date = String(url).split('/v1/')[1]?.slice(0, 10)
    if (String(url).includes('base=LKR')) {
      return { ok: false, json: async () => ({}) }
    }
    return {
      ok: true,
      json: async () => ({
        amount: 1,
        base: 'EUR',
        date,
        rates: { CZK: 24.329 },
      }),
    }
  }) as unknown as typeof fetch
})

async function shown() {
  render(<QuickAddForm groupId="g1" />)
  expect(await screen.findByTestId('quick-amount')).toBeInTheDocument()
}

describe('QuickAddForm currency', () => {
  it('keeps amount, name and add on the default group currency', async () => {
    await shown()
    expect(screen.getByLabelText('Částka')).toBeInTheDocument()
    expect(screen.getByLabelText('Název')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Přidat' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: /CZK/ })).toBeInTheDocument()
    expect(screen.queryByTestId('quick-conversion')).not.toBeInTheDocument()

    fireEvent.change(screen.getByTestId('quick-amount'), {
      target: { value: '120,50' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Přidat' }))

    await waitFor(() => expect(mockMutateAsync).toHaveBeenCalled())
    const values = mockMutateAsync.mock.calls[0][0].expenseFormValues
    expect(values.amount).toBe(12050)
    expect(values.paidBy).toBe('a')
    expect(values.originalCurrency).toBeUndefined()
    expect(values.conversionRate).toBeUndefined()
  })

  it('defaults the payer to the active participant, not the first one', async () => {
    localStorage.setItem('g1-activeUser', 'b')
    await shown()
    expect(screen.getByTestId('quick-payer')).toHaveTextContent('Petr')
    fireEvent.change(screen.getByTestId('quick-amount'), {
      target: { value: '10' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Přidat' }))
    await waitFor(() => expect(mockMutateAsync).toHaveBeenCalled())
    expect(mockMutateAsync.mock.calls[0][0].expenseFormValues.paidBy).toBe('b')
  })

  it('does not submit as the group owner when nobody is chosen', async () => {
    localStorage.removeItem('g1-activeUser')
    await shown()
    expect(screen.getByTestId('quick-payer')).toHaveTextContent('Kdo jsi?')
    fireEvent.change(screen.getByTestId('quick-amount'), {
      target: { value: '10' },
    })
    expect(screen.getByRole('button', { name: 'Přidat' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Přidat' }))
    expect(mockMutateAsync).not.toHaveBeenCalled()
  })

  it('converts a fetched foreign amount into CZK and keeps the original', async () => {
    localStorage.setItem('g1-lastCurrency', 'EUR')
    await shown()
    expect(await screen.findByTestId('quick-conversion')).toHaveTextContent(
      /1 EUR =/,
    )
    fireEvent.change(screen.getByTestId('quick-amount'), {
      target: { value: '100' },
    })
    expect(await screen.findByText(/≈/)).toHaveTextContent('Kč')
    fireEvent.click(screen.getByRole('button', { name: 'Přidat' }))
    await waitFor(() => expect(mockMutateAsync).toHaveBeenCalled())
    expect(mockMutateAsync.mock.calls[0][0].expenseFormValues).toMatchObject({
      amount: 243290,
      originalAmount: 10000,
      originalCurrency: 'EUR',
      conversionRate: 24.329,
    })
  })

  it('asks for a manual rate when the feed has no currency', async () => {
    localStorage.setItem('g1-lastCurrency', 'LKR')
    await shown()
    const rate = await screen.findByTestId('quick-rate')
    expect(screen.getByRole('button', { name: 'Přidat' })).toBeDisabled()
    fireEvent.change(screen.getByTestId('quick-amount'), {
      target: { value: '1000' },
    })
    fireEvent.change(rate, { target: { value: '0,08' } })
    expect(await screen.findByText(/≈/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Přidat' }))
    await waitFor(() => expect(mockMutateAsync).toHaveBeenCalled())
    expect(mockMutateAsync.mock.calls[0][0].expenseFormValues).toMatchObject({
      amount: 8000,
      originalAmount: 100000,
      originalCurrency: 'LKR',
      conversionRate: 0.08,
    })
  })
})
