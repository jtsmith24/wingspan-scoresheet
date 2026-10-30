export type Move = "up" | "down" | "left" | "right" | "down-wrap" | "up-wrap";

export interface Cell {
  row: number;
  col: number;
}

/**
 * Spreadsheet-style movement through the score grid.
 *
 * - up/down/left/right stop at the edges.
 * - down-wrap (Enter) walks down a player's column, then jumps to `wrapRow`
 *   (the first score row) of the next column, so one person can read out a
 *   whole column in one go.
 * - up-wrap (Shift+Enter) is the reverse.
 * Disabled cells (for example, tie-breaker inputs for players who aren't
 * tied) are skipped. Returns null when there is nowhere to go.
 */
export function nextCell(
  from: Cell,
  move: Move,
  rows: number,
  cols: number,
  isEnabled: (cell: Cell) => boolean = () => true,
  wrapRow = 0,
): Cell | null {
  const step = (c: Cell): Cell | null => {
    switch (move) {
      case "up":
        return c.row > 0 ? { row: c.row - 1, col: c.col } : null;
      case "down":
        return c.row < rows - 1 ? { row: c.row + 1, col: c.col } : null;
      case "left":
        return c.col > 0 ? { row: c.row, col: c.col - 1 } : null;
      case "right":
        return c.col < cols - 1 ? { row: c.row, col: c.col + 1 } : null;
      case "down-wrap":
        if (c.row < rows - 1) return { row: c.row + 1, col: c.col };
        return c.col < cols - 1 ? { row: wrapRow, col: c.col + 1 } : null;
      case "up-wrap":
        if (c.row > wrapRow) return { row: c.row - 1, col: c.col };
        return c.col > 0 ? { row: rows - 1, col: c.col - 1 } : null;
    }
  };

  let cell = step(from);
  for (let guard = rows * cols; cell && guard > 0; guard--) {
    if (isEnabled(cell)) return cell;
    cell = step(cell);
  }
  return null;
}
