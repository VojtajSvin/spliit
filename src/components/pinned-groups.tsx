'use client'

import { createContext, useContext } from 'react'

/** Group ids from DEFAULT_GROUP_IDS, shown first on owner devices only. */
const PinnedGroupsContext = createContext<string[]>([])

export function PinnedGroupsProvider({
  ids,
  children,
}: {
  ids: string[]
  children: React.ReactNode
}) {
  return (
    <PinnedGroupsContext.Provider value={ids}>
      {children}
    </PinnedGroupsContext.Provider>
  )
}

export const usePinnedGroups = () => useContext(PinnedGroupsContext)
