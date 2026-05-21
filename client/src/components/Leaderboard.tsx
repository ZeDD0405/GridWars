import { useEffect, useRef, useState } from 'react'
import type { LeaderboardEntry, UserInfo } from '../types'

interface Props {
  user: UserInfo | null
  myCount: number
  leaderboard: LeaderboardEntry[]
  cooldownEnd: number
  totalClaimed: number
  totalCells: number
}

const MEDALS = ['🥇', '🥈', '🥉']

export default function Leaderboard({ user, myCount, leaderboard, cooldownEnd, totalClaimed, totalCells }: Props) {
  const [tick, setTick] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (cooldownEnd <= Date.now()) { setTick(t => t + 1); return }
    intervalRef.current = setInterval(() => {
      setTick(t => t + 1)
      if (Date.now() >= cooldownEnd && intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }, 50)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [cooldownEnd])

  void tick // used only to trigger re-render on each tick

  const now = Date.now()
  const onCooldown = now < cooldownEnd
  const cooldownProgress = onCooldown ? Math.max(0, ((cooldownEnd - now) / 3000) * 100) : 0
  const myRank = leaderboard.findIndex(e => e.name === user?.userName) + 1

  return (
    <aside className="sidebar">

      {/* ── Your card ─────────────────────────────── */}
      {user && (
        <div className="card user-card">
          <div className="user-card-top">
            <div
              className="user-avatar"
              style={{ backgroundColor: user.userColor }}
            >
              {user.userName.charAt(0)}
            </div>
            <div className="user-info">
              <div className="user-name">{user.userName}</div>
              <div className="user-meta">
                {myCount} {myCount === 1 ? 'cell' : 'cells'} owned
                {myRank > 0 && <span className="user-rank"> · #{myRank}</span>}
              </div>
            </div>
          </div>

          {/* cooldown bar */}
          <div className="cooldown-track" title={onCooldown ? 'Cooldown active…' : 'Ready to claim!'}>
            <div
              className="cooldown-fill"
              style={{
                width: `${100 - cooldownProgress}%`,
                backgroundColor: user.userColor,
                transition: onCooldown ? 'width 0.05s linear' : 'none',
              }}
            />
          </div>
          <div className="cooldown-label">
            {onCooldown ? 'cooldown…' : '⚡ ready to claim'}
          </div>
        </div>
      )}

      {/* ── Leaderboard ───────────────────────────── */}
      <div className="card">
        <div className="card-title">Leaderboard</div>
        <div className="lb-progress-row">
          <div className="lb-bar-track">
            <div
              className="lb-bar-fill"
              style={{ width: `${totalCells ? (totalClaimed / totalCells) * 100 : 0}%` }}
            />
          </div>
          <span className="lb-stat">
            {totalClaimed}<span className="lb-stat-dim">/{totalCells}</span>
          </span>
        </div>

        {leaderboard.length === 0 ? (
          <div className="lb-empty">No claims yet — be first!</div>
        ) : (
          <ol className="lb-list">
            {leaderboard.map((entry, i) => (
              <li
                key={entry.name}
                className={`lb-item${entry.name === user?.userName ? ' lb-item-me' : ''}`}
              >
                <span className="lb-rank">
                  {i < 3 ? MEDALS[i] : <span className="lb-rank-num">{i + 1}</span>}
                </span>
                <span
                  className="lb-swatch"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="lb-name">{entry.name}</span>
                <span className="lb-count">{entry.count}</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* ── How to play ───────────────────────────── */}
      <div className="card hint-card">
        <div className="hint-line">Click any cell to claim it</div>
        <div className="hint-line muted">3-second cooldown between claims</div>
        <div className="hint-line muted">Cells can be stolen by others</div>
      </div>

    </aside>
  )
}
