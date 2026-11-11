export const ROWS = 6;
export const COLS = 7;
export const EMPTY = 0;
export const RED = 1;
export const YELLOW = 2;

export function newBoard() {
  return {
    cells: Array.from({ length: ROWS }, () => Array(COLS).fill(EMPTY)),
    turn: 0,
  };
}

export function clone(board) {
  return {
    cells: board.cells.map((row) => row.slice()),
    turn: board.turn,
  };
}

export function colorToMove(board) {
  return board.turn % 2 === 0 ? RED : YELLOW;
}

export function opponent(color) {
  return color === RED ? YELLOW : RED;
}

export function columnFull(board, col) {
  return board.cells[0][col] !== EMPTY;
}

export function dropRow(board, col) {
  let index = -1;
  for (let row = 0; row < ROWS; row++) {
    if (board.cells[row][col] === EMPTY) index = row;
  }
  return index;
}

export function drop(board, col) {
  const row = dropRow(board, col);
  if (row < 0) throw new Error(`column ${col} is full`);
  board.cells[row][col] = colorToMove(board);
  board.turn += 1;
  return row;
}

export function fromMoves(moves) {
  const board = newBoard();
  for (const col of moves) drop(board, col);
  return board;
}

export function fromCells(cells, turn = 0) {
  return { cells: cells.map((row) => row.slice()), turn };
}

function buildLines() {
  const lines = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col <= COLS - 4; col++) {
      lines.push([
        [row, col],
        [row, col + 1],
        [row, col + 2],
        [row, col + 3],
      ]);
    }
  }
  for (let col = 0; col < COLS; col++) {
    for (let row = 0; row <= ROWS - 4; row++) {
      lines.push([
        [row, col],
        [row + 1, col],
        [row + 2, col],
        [row + 3, col],
      ]);
    }
  }
  for (let row = 0; row <= ROWS - 4; row++) {
    for (let col = 0; col <= COLS - 4; col++) {
      lines.push([
        [row, col],
        [row + 1, col + 1],
        [row + 2, col + 2],
        [row + 3, col + 3],
      ]);
    }
  }
  for (let row = 0; row <= ROWS - 4; row++) {
    for (let col = 3; col < COLS; col++) {
      lines.push([
        [row, col],
        [row + 1, col - 1],
        [row + 2, col - 2],
        [row + 3, col - 3],
      ]);
    }
  }
  return lines;
}

export const LINES = buildLines();

export function winner(board) {
  for (const line of LINES) {
    const color = board.cells[line[0][0]][line[0][1]];
    if (color === EMPTY) continue;
    if (line.every(([row, col]) => board.cells[row][col] === color)) return color;
  }
  return EMPTY;
}

export function winningCells(board) {
  const found = [];
  for (const line of LINES) {
    const color = board.cells[line[0][0]][line[0][1]];
    if (color === EMPTY) continue;
    if (line.every(([row, col]) => board.cells[row][col] === color)) found.push(...line);
  }
  return found;
}

export function winnerAt(board, row, col) {
  const color = board.cells[row][col];
  if (color === EMPTY) return EMPTY;
  const directions = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ];
  for (const [dr, dc] of directions) {
    let count = 1;
    for (const sign of [1, -1]) {
      let r = row + dr * sign;
      let c = col + dc * sign;
      while (r >= 0 && r < ROWS && c >= 0 && c < COLS && board.cells[r][c] === color) {
        count += 1;
        r += dr * sign;
        c += dc * sign;
      }
    }
    if (count >= 4) return color;
  }
  return EMPTY;
}

export function isDraw(board) {
  return winner(board) === EMPTY && board.turn === ROWS * COLS;
}

export function legalMoves(board) {
  const moves = [];
  for (let col = 0; col < COLS; col++) {
    if (!columnFull(board, col)) moves.push(col);
  }
  return moves;
}
