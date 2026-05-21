import { useGridSocket } from './hooks/useGridSocket'
import Grid from './components/Grid'
import Header from './components/Header'
import Leaderboard from './components/Leaderboard'

export default function App() {
  const { state, claimCell } = useGridSocket()

  const myCount =
    state.leaderboard.find((e) => e.name === state.user?.userName)?.count ?? 0

  return (
    <div className="app-shell">
      <Header onlineCount={state.onlineCount} connected={state.connected} />

      <main className="app-main">
        {/* ── Grid area ── */}
        <div className="grid-area">
          <Grid
            cells={state.cells}
            userId={state.user?.userId ?? null}
            recentlyClaimed={state.recentlyClaimed}
            onClaim={claimCell}
          />

          {state.cells.length > 0 && (
            <div className="grid-footer">
              <span className="gf-label">Territory control</span>
              <div className="gf-bar-track">
                <div
                  className="gf-bar-fill"
                  style={{
                    width: `${(state.totalClaimed / state.cells.length) * 100}%`,
                  }}
                />
              </div>
              <span className="gf-stat">
                {state.totalClaimed}
                <span className="gf-stat-dim"> / {state.cells.length} cells claimed</span>
              </span>
            </div>
          )}
        </div>

        {/* ── Sidebar ── */}
        <Leaderboard
          user={state.user}
          myCount={myCount}
          leaderboard={state.leaderboard}
          cooldownEnd={state.cooldownEnd}
          totalClaimed={state.totalClaimed}
          totalCells={state.cells.length}
        />
      </main>
    </div>
  )
}
