import { createContext, use } from 'react'
import type { RealtimeStatus } from './socket'

export const RealtimeStatusContext = createContext<RealtimeStatus>('connecting')

export function useRealtimeStatus() {
  return use(RealtimeStatusContext)
}
