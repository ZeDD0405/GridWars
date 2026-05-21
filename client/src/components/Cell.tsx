import React, { useEffect, useRef, useState } from 'react'
import type { CellData } from '../types'

interface Props {
  cell: CellData
  isMine: boolean
  isRecent: boolean
  'data-cell-id': number
}

const Cell = React.memo(({ cell, isMine, isRecent, ...rest }: Props) => {
  const [popping, setPopping] = useState(false)
  const prevRecent = useRef(false)

  useEffect(() => {
    if (isRecent && !prevRecent.current) {
      setPopping(true)
      const t = setTimeout(() => setPopping(false), 600)
      prevRecent.current = true
      return () => clearTimeout(t)
    }
    if (!isRecent) prevRecent.current = false
  }, [isRecent])

  const bg = cell.owner_color ?? '#1a1a30'

  let shadow: string | undefined
  if (isMine) {
    shadow = 'inset 0 0 0 2px rgba(255,255,255,0.75)'
  } else if (popping && cell.owner_color) {
    shadow = `0 0 0 3px ${cell.owner_color}66`
  }

  return (
    <div
      {...rest}
      title={cell.owner_name ? `Owned by ${cell.owner_name}` : 'Unclaimed — click to take it!'}
      className={`cell${popping ? ' cell-pop' : ''}${!cell.owner_id ? ' cell-empty' : ''}`}
      style={{ backgroundColor: bg, boxShadow: shadow }}
    />
  )
})

Cell.displayName = 'Cell'
export default Cell
