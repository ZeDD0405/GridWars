export interface CellData {
  id: number
  owner_id: string | null
  owner_name: string | null
  owner_color: string | null
  claimed_at: number | null
}

export interface LeaderboardEntry {
  name: string
  color: string
  count: number
}

export interface UserInfo {
  userId: string
  userName: string
  userColor: string
}
