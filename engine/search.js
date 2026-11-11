import {
  COLS,
  EMPTY,
  LINES,
  RED,
  YELLOW,
  clone,
  colorToMove,
  columnFull,
  opponent,
  winnerAt,
} from "./rules.js";

const ORDER = [3, 2, 4, 1, 5, 0, 6];
const MATE = 100000;

const WEIGHT = [0, 1, 8, 40, MATE];

export function evaluate(board) {
  let score = 0;
  for (const line of LINES) {
    let red = 0;
    let yellow = 0;
    for (const [row, col] of line) {
      const color = board.cells[row][col];
      if (color === RED) red += 1;
      else if (color !== EMPTY) yellow += 1;
    }
    if (red && yellow) continue;
    const weight = WEIGHT[red + yellow];
    score += red ? weight : yellow ? -weight : 0;
  }
  for (let row = 0; row < board.cells.length; row++) {
    if (board.cells[row][3] === RED) score += 3;
    else if (board.cells[row][3] === YELLOW) score -= 3;
  }
  return score;
}

function place(board, col, color) {
  for (let row = 5; row >= 0; row--) {
    if (board.cells[row][col] === EMPTY) {
      board.cells[row][col] = color;
      board.turn += 1;
      return row;
    }
  }
  throw new Error(`column ${col} is full`);
}

function undo(board, row, col) {
  board.cells[row][col] = EMPTY;
  board.turn -= 1;
}

function ordered(board, color) {
  const wins = [];
  const rest = [];
  for (const col of ORDER) {
    if (columnFull(board, col)) continue;
    const row = place(board, col, color);
    const win = winnerAt(board, row, col) === color;
    undo(board, row, col);
    if (win) wins.push(col);
    else rest.push(col);
  }
  return wins.concat(rest);
}

export function chooseSearch(board, depth) {
  const work = clone(board);
  const me = colorToMove(work);
  let nodes = 0;

  function negamax(bd, d, alpha, beta, color) {
    nodes += 1;
    const moves = [];
    for (let col = 0; col < COLS; col++) {
      if (!columnFull(bd, col)) moves.push(col);
    }
    if (moves.length === 0) return 0;
    if (d === 0) return color === RED ? evaluate(bd) : -evaluate(bd);

    const cols = d >= 2 ? ordered(bd, color) : ORDER.filter((col) => !columnFull(bd, col));
    let best = -Infinity;
    for (const col of cols) {
      const row = place(bd, col, color);
      let score;
      if (winnerAt(bd, row, col) === color) score = MATE + (d - 1);
      else score = -negamax(bd, d - 1, -beta, -alpha, opponent(color));
      undo(bd, row, col);
      if (score > best) best = score;
      if (score > alpha) alpha = score;
      if (alpha >= beta) break;
    }
    return best;
  }

  let bestCol = null;
  let bestScore = -Infinity;
  let alpha = -Infinity;
  for (const col of ordered(work, me)) {
    const row = place(work, col, me);
    let score;
    if (winnerAt(work, row, col) === me) score = MATE + (depth - 1);
    else score = -negamax(work, depth - 1, -Infinity, -alpha, opponent(me));
    undo(work, row, col);
    if (score > bestScore) {
      bestScore = score;
      bestCol = col;
    }
    if (score > alpha) alpha = score;
  }

  return { col: bestCol, score: bestScore, nodes, depth };
}
