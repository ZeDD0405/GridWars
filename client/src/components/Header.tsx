interface Props {
  onlineCount: number
  connected: boolean
}

export default function Header({ onlineCount, connected }: Props) {
  return (
    <header className="header">
      <div className="header-brand">
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
          {[0,1,2,3].map(r => [0,1,2,3].map(c => (
            <rect
              key={`${r}-${c}`}
              x={c * 6}
              y={r * 6}
              width="4"
              height="4"
              rx="0.8"
              fill={(r + c) % 2 === 0 ? '#7c6fff' : '#2a2a4a'}
            />
          )))}
        </svg>
        <span className="brand-name">GridWars</span>
        <span className="brand-sub">claim your territory</span>
      </div>

      <div className="header-status">
        <span className={`status-dot ${connected ? 'status-online' : 'status-offline'}`} />
        <span className="status-text">
          {connected
            ? `${onlineCount} online`
            : 'reconnecting…'}
        </span>
      </div>
    </header>
  )
}
