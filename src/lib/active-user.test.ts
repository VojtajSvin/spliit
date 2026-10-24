import {
  ACTIVE_USER_NONE,
  chosenParticipantId,
  claimPendingActiveUser,
  participantStatus,
  settlementForParticipant,
} from './active-user'

const people = [
  { id: 'owner', name: 'Owner' },
  { id: 'guest', name: 'Guest' },
]

beforeEach(() => {
  localStorage.clear()
})

describe('chosenParticipantId', () => {
  const ids = ['owner', 'guest']

  it('uses only a participant id stored for this device', () => {
    expect(chosenParticipantId('guest', ids)).toBe('guest')
    expect(chosenParticipantId(null, ids)).toBeNull()
    expect(chosenParticipantId(undefined, ids)).toBeNull()
    expect(chosenParticipantId(ACTIVE_USER_NONE, ids)).toBeNull()
    expect(chosenParticipantId('none', ids)).toBeNull()
    expect(chosenParticipantId('missing', ids)).toBeNull()
  })

  it('does not fall back to the first participant', () => {
    expect(chosenParticipantId(null, ids)).not.toBe('owner')
    expect(chosenParticipantId(ACTIVE_USER_NONE, ids)).not.toBe(ids[0])
  })
})

describe('settlementForParticipant', () => {
  const rows = [
    { from: 'guest', to: 'owner', amount: 100 },
    { from: 'owner', to: 'third', amount: 5 },
  ]

  it('shows what this person owes, not the group-wide first settlement', () => {
    expect(settlementForParticipant(rows, 'owner')).toEqual(rows[1])
    expect(settlementForParticipant(rows, 'guest')).toEqual(rows[0])
    expect(settlementForParticipant(rows, 'third')).toEqual({
      from: 'owner',
      to: 'third',
      amount: 5,
    })
  })

  it('is empty when this person is already settled', () => {
    expect(settlementForParticipant(rows, 'nobody')).toBeNull()
    expect(settlementForParticipant([], 'owner')).toBeNull()
  })
})

describe('participantStatus', () => {
  it('lists each creditor, largest first, and stops at three lines', () => {
    const rows = [
      { from: 'me', to: 'a', amount: 10 },
      { from: 'me', to: 'b', amount: 40 },
      { from: 'me', to: 'c', amount: 30 },
      { from: 'me', to: 'd', amount: 20 },
      { from: 'x', to: 'me', amount: 999 },
    ]

    expect(participantStatus(rows, 'me')).toEqual({
      kind: 'owe',
      lines: [
        { from: 'me', to: 'b', amount: 40 },
        { from: 'me', to: 'c', amount: 30 },
        { from: '', to: '', amount: 30, others: 2 },
      ],
    })
  })

  it('lists people who owe this participant when they owe nobody', () => {
    expect(
      participantStatus(
        [
          { from: 'a', to: 'me', amount: 15 },
          { from: 'b', to: 'me', amount: 5 },
        ],
        'me',
      ),
    ).toEqual({
      kind: 'owed',
      lines: [
        { from: 'a', to: 'me', amount: 15 },
        { from: 'b', to: 'me', amount: 5 },
      ],
    })
  })

  it('is settled when no reimbursement involves them', () => {
    expect(
      participantStatus([{ from: 'a', to: 'b', amount: 10 }], 'me'),
    ).toEqual({ kind: 'settled' })
  })
})

describe('claimPendingActiveUser', () => {
  it('keeps a new-group profile on that group', () => {
    localStorage.setItem('newGroup-activeUser', 'Guest')
    localStorage.setItem('newGroup-activeUser-for', 'new-group')

    claimPendingActiveUser('new-group', people)

    expect(localStorage.getItem('new-group-activeUser')).toBe('guest')
    expect(localStorage.getItem('newGroup-activeUser')).toBeNull()
    expect(localStorage.getItem('newGroup-activeUser-for')).toBeNull()
  })

  it('does not copy that profile onto another group, even with the same name', () => {
    localStorage.setItem('newGroup-activeUser', 'Owner')
    localStorage.setItem('newGroup-activeUser-for', 'new-group')

    claimPendingActiveUser('other-group', people)

    expect(localStorage.getItem('other-group-activeUser')).toBeNull()
    expect(localStorage.getItem('newGroup-activeUser')).toBe('Owner')
    expect(localStorage.getItem('newGroup-activeUser-for')).toBe('new-group')
  })

  it('does not invent the first participant when the pending name matches nobody', () => {
    localStorage.setItem('newGroup-activeUser', 'Žádný')
    localStorage.setItem('newGroup-activeUser-for', 'new-group')

    claimPendingActiveUser('new-group', people)

    expect(localStorage.getItem('new-group-activeUser')).toBeNull()
    expect(localStorage.getItem('newGroup-activeUser')).toBeNull()
  })

  it('does not overwrite a choice this device already made', () => {
    localStorage.setItem('new-group-activeUser', 'guest')
    localStorage.setItem('newGroup-activeUser', 'Owner')
    localStorage.setItem('newGroup-activeUser-for', 'new-group')

    claimPendingActiveUser('new-group', people)

    expect(localStorage.getItem('new-group-activeUser')).toBe('guest')
  })
})
