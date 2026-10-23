/**
 * Who the person holding this device is, inside one group.
 *
 * Stored only in localStorage (`${groupId}-activeUser`). It is never derived
 * from the owner cookie or from the first participant in the group: those
 * belong to whoever created the group, not to whoever is looking at it.
 */

export const ACTIVE_USER_NONE = 'None'
export const NEW_GROUP_ACTIVE_USER_KEY = 'newGroup-activeUser'
export const NEW_GROUP_ACTIVE_USER_FOR_KEY = 'newGroup-activeUser-for'
export const ACTIVE_USER_CHANGED_EVENT = 'spliit-active-user'
export const OPEN_ACTIVE_USER_EVENT = 'spliit-open-active-user'

export function activeUserStorageKey(groupId: string) {
  return `${groupId}-activeUser`
}

/** The viewer explicitly declined to pick a participant. */
export function isOptOut(value: string | null | undefined) {
  return value === ACTIVE_USER_NONE || value === 'none'
}

/**
 * The participant id this device chose, or null when nothing usable is stored.
 * `None` / `none` and ids that are not in the group are not a person.
 */
export function chosenParticipantId(
  stored: string | null | undefined,
  participantIds: readonly string[],
): string | null {
  if (!stored || isOptOut(stored)) return null
  return participantIds.includes(stored) ? stored : null
}

/**
 * The settlement to show for one person. Prefers a payment they still have to
 * make; otherwise the largest amount someone owes them. Other people's
 * settlements are ignored.
 */
export function settlementForParticipant<
  T extends { from: string; to: string; amount: number },
>(reimbursements: readonly T[], participantId: string): T | null {
  const mine = reimbursements.filter(
    (reimbursement) =>
      reimbursement.from === participantId ||
      reimbursement.to === participantId,
  )
  const owedByMe = mine.filter(
    (reimbursement) => reimbursement.from === participantId,
  )
  const pool = owedByMe.length > 0 ? owedByMe : mine
  if (pool.length === 0) return null
  return pool.reduce((best, item) => (item.amount > best.amount ? item : best))
}

export function persistActiveUser(groupId: string, value: string) {
  localStorage.setItem(activeUserStorageKey(groupId), value)
  window.dispatchEvent(
    new CustomEvent(ACTIVE_USER_CHANGED_EVENT, {
      detail: { groupId, value },
    }),
  )
}

export function openActiveUserPicker() {
  window.dispatchEvent(new Event(OPEN_ACTIVE_USER_EVENT))
}

/**
 * Applies the profile chosen while creating a group, and only to that group.
 *
 * `newGroup-activeUser-for` is the new group's id. Without it (older clients
 * and the test fixture) the value applies to whichever group is opened next,
 * then it is dropped so it cannot leak into a later group. A pending profile
 * aimed at a different group is left untouched. A name that matches nobody is
 * not replaced with the first participant.
 */
export function claimPendingActiveUser(
  groupId: string,
  participants: readonly { id: string; name: string }[],
) {
  const pending = localStorage.getItem(NEW_GROUP_ACTIVE_USER_KEY)
  const pendingFor = localStorage.getItem(NEW_GROUP_ACTIVE_USER_FOR_KEY)
  const namedUser = localStorage.getItem(`${groupId}-newUser`)

  if (pending && (!pendingFor || pendingFor === groupId)) {
    const existing = localStorage.getItem(activeUserStorageKey(groupId))
    if (!existing) {
      if (isOptOut(pending)) {
        persistActiveUser(groupId, ACTIVE_USER_NONE)
      } else {
        const match = participants.find((p) => p.name === pending)
        if (match) persistActiveUser(groupId, match.id)
      }
    }
    localStorage.removeItem(NEW_GROUP_ACTIVE_USER_KEY)
    localStorage.removeItem(NEW_GROUP_ACTIVE_USER_FOR_KEY)
  }

  if (!namedUser) return
  localStorage.removeItem(`${groupId}-newUser`)
  const existing = localStorage.getItem(activeUserStorageKey(groupId))
  if (existing) return
  const match = participants.find((p) => p.name === namedUser)
  if (match) persistActiveUser(groupId, match.id)
}
