import React, { useCallback } from 'react'
import Cell from './Cell'
import type { CellData } from '../types'

const COLS = 32

interface Props {
  cells: CellData[]
  userId: string | null
  recentlyClaimed: Set<number>
  onClaim: (cellId: number) => void
}

const Grid = React.memo(({ cells, userId, recentlyClaimed, onClaim }: Props) => {
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const id = (e.target as HTMLElement).dataset.cellId
      if (id !== undefined) onClaim(parseInt(id, 10))
    },
    [onClaim],
  )

  if (cells.length === 0) {
    return (
      <div className="grid-placeholder">
        <div className="connecting-spinner" />
        <span>Connecting…</span>
      </div>
    )
  }

  return (
    <div
      className="grid-board"
      style={{ gridTemplateColumns: `repeat(${COLS}, 20px)` }}
      onClick={handleClick}
    >
      {cells.map((cell) => (
        <Cell
          key={cell.id}
          cell={cell}
          isMine={cell.owner_id === userId}
          isRecent={recentlyClaimed.has(cell.id)}
          data-cell-id={cell.id}
        />
      ))}
    </div>
  )
})

Grid.displayName = 'Grid'
export default Grid
