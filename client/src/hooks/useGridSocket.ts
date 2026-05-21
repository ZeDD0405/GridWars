import { useReducer, useEffect, useRef, useCallback } from 'react'
import type { CellData, LeaderboardEntry, UserInfo } from '../types'

export interface GridState {
  cells: CellData[]
  user: UserInfo | null
  leaderboard: LeaderboardEntry[]
  onlineCount: number
  totalClaimed: number
  cooldownEnd: number
  recentlyClaimed: Set<number>
  connected: boolean
}

const WS_URL = import.meta.env.DEV
  ? `ws://${window.location.hostname}:3001`
  : `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}`

const ANIM_MS = 700

type Action =
  | { type: 'DISCONNECTED' }
  | { type: 'INIT'; data: { userId: string; userName: string; userColor: string; grid: CellData[]; leaderboard: LeaderboardEntry[]; onlineCount: number; totalClaimed: number } }
  | { type: 'CELL_CLAIMED'; cellId: number; ownerId: string; ownerName: string; ownerColor: string; claimedAt: number }
  | { type: 'LEADERBOARD_UPDATE'; leaderboard: LeaderboardEntry[]; totalClaimed: number }
  | { type: 'ONLINE_COUNT'; count: number }
  | { type: 'SET_COOLDOWN'; cooldownEnd: number }
  | { type: 'CLEAR_ANIM'; cellId: number }

const initial: GridState = {
  cells: [],
  user: null,
  leaderboard: [],
  onlineCount: 0,
  totalClaimed: 0,
  cooldownEnd: 0,
  recentlyClaimed: new Set(),
  connected: false,
}

function reducer(state: GridState, action: Action): GridState {
  switch (action.type) {
    case 'DISCONNECTED':
      return { ...state, connected: false }

    case 'INIT': {
      const { userId, userName, userColor, grid, leaderboard, onlineCount, totalClaimed } = action.data
      return {
        ...state,
        user: { userId, userName, userColor },
        cells: grid,
        leaderboard,
        onlineCount,
        totalClaimed,
        connected: true,
      }
    }

    case 'CELL_CLAIMED': {
      const next = state.cells.slice()
      next[action.cellId] = {
        id: action.cellId,
        owner_id: action.ownerId,
        owner_name: action.ownerName,
        owner_color: action.ownerColor,
        claimed_at: action.claimedAt,
      }
      const recents = new Set(state.recentlyClaimed)
      recents.add(action.cellId)
      return { ...state, cells: next, recentlyClaimed: recents }
    }

    case 'LEADERBOARD_UPDATE':
      return { ...state, leaderboard: action.leaderboard, totalClaimed: action.totalClaimed }

    case 'ONLINE_COUNT':
      return { ...state, onlineCount: action.count }

    case 'SET_COOLDOWN':
      return { ...state, cooldownEnd: action.cooldownEnd }

    case 'CLEAR_ANIM': {
      const recents = new Set(state.recentlyClaimed)
      recents.delete(action.cellId)
      return { ...state, recentlyClaimed: recents }
    }

    default:
      return state
  }
}

export function useGridSocket() {
  const [state, dispatch] = useReducer(reducer, initial)
  const wsRef = useRef<WebSocket | null>(null)
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.CONNECTING) return

    const ws = new WebSocket(WS_URL)
    wsRef.current = ws

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data as string)
        switch (msg.type) {
          case 'init':
            dispatch({ type: 'INIT', data: msg })
            break
          case 'cell_claimed':
            dispatch({ type: 'CELL_CLAIMED', cellId: msg.cellId, ownerId: msg.ownerId, ownerName: msg.ownerName, ownerColor: msg.ownerColor, claimedAt: msg.claimedAt })
            setTimeout(() => dispatch({ type: 'CLEAR_ANIM', cellId: msg.cellId }), ANIM_MS)
            break
          case 'leaderboard_update':
            dispatch({ type: 'LEADERBOARD_UPDATE', leaderboard: msg.leaderboard, totalClaimed: msg.totalClaimed })
            break
          case 'online_count':
            dispatch({ type: 'ONLINE_COUNT', count: msg.count })
            break
          case 'cooldown_error':
            dispatch({ type: 'SET_COOLDOWN', cooldownEnd: Date.now() + msg.remaining })
            break
        }
      } catch { /* ignore parse errors */ }
    }

    ws.onclose = () => {
      dispatch({ type: 'DISCONNECTED' })
      retryRef.current = setTimeout(connect, 2500)
    }

    ws.onerror = () => ws.close()
  }, [])

  useEffect(() => {
    connect()
    return () => {
      if (retryRef.current) clearTimeout(retryRef.current)
      wsRef.current?.close()
    }
  }, [connect])

  const claimCell = useCallback((cellId: number) => {
    const now = Date.now()
    if (now < state.cooldownEnd) return
    if (wsRef.current?.readyState !== WebSocket.OPEN) return
    wsRef.current.send(JSON.stringify({ type: 'claim', cellId }))
    dispatch({ type: 'SET_COOLDOWN', cooldownEnd: now + 3000 })
  }, [state.cooldownEnd])

  return { state, claimCell }
}
