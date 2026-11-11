// Port of archive/sources/GameBoardAI.txt. Same weights, same string scan,
// same simulation bug. fixReset is the one-line correction used for comparison.

const ROWS = 6;
const COLS = 7;
const EMPTY = "⚪";
const RED = "🔴";
const YELLOW = "🟡";
const JAVA_MIN = -2147483648;
const JAVA_MAX = 2147483647;

export { JAVA_MIN, JAVA_MAX, EMPTY, RED, YELLOW };

export function newStringBoard() {
  return {
    cells: Array.from({ length: ROWS }, () => Array(COLS).fill(EMPTY)),
    turn: 0,
  };
}

export function fromMoves(moves) {
  const board = newStringBoard();
  for (const col of moves) {
    if (fullCol(board, col)) throw new Error(`column ${col} is full`);
    dropDisc(board, col);
  }
  return board;
}

export function fromCells(cells, turn = 0) {
  const glyph = [EMPTY, RED, YELLOW];
  return {
    cells: cells.map((row) => row.map((value) => glyph[value])),
    turn,
  };
}

function copyBoard(source, aiTurn) {
  const next = newStringBoard();
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) next.cells[row][col] = source.cells[row][col];
  }
  if (aiTurn === 1) next.turn = 1;
  return next;
}

function fullCol(board, col) {
  return board.cells[0][col] !== EMPTY;
}

function fullBoard(board) {
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      if (board.cells[row][col] === EMPTY) return false;
    }
  }
  return true;
}

function dropDisc(board, col) {
  let index = 0;
  for (let row = 0; row < ROWS; row++) {
    if (board.cells[row][col] === EMPTY) index = row;
  }
  board.cells[index][col] = board.turn % 2 === 0 ? RED : YELLOW;
  board.turn += 1;
  return index;
}

function substringSearch(big, little) {
  let count = 0;
  let index = 0;
  while ((index = big.indexOf(little, index)) !== -1) {
    count += 1;
    index += 1;
  }
  return count;
}

function repeat(glyph, size) {
  let text = "";
  for (let i = 0; i < size; i++) text += glyph;
  return text;
}

function rowString(board) {
  let text = "";
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) text += board.cells[row][col];
    text += "\n";
  }
  return text;
}

function colString(board) {
  let text = "";
  for (let col = 0; col < COLS; col++) {
    for (let row = 0; row < ROWS; row++) text += board.cells[row][col];
    text += "\n";
  }
  return text;
}

function counts(text, size) {
  return {
    count1: substringSearch(text, repeat(RED, size)),
    count2: substringSearch(text, repeat(YELLOW, size)),
  };
}

export function checkLineHorizontal(board, size) {
  const found = counts(rowString(board), size);
  return { hit: found.count1 !== 0 || found.count2 !== 0, ...found };
}

export function checkLineWinnableHorizontal(board, size) {
  const text = rowString(board);
  const found = {
    count1: substringSearch(text, EMPTY + repeat(RED, size) + EMPTY),
    count2: substringSearch(text, EMPTY + repeat(YELLOW, size) + EMPTY),
  };
  return { hit: found.count1 !== 0 || found.count2 !== 0, ...found };
}

export function checkLineVertical(board, size) {
  const found = counts(colString(board), size);
  return { hit: found.count1 !== 0 || found.count2 !== 0, ...found };
}

// Threat scan. The second diagonal string is missing the newlines that
// checkWin inserts, and the column loop adds none. Separate diagonals can glue.
export function diagonalStrings(board) {
  let first = "";
  let second = "";
  for (let row = 0; row < ROWS; row++) {
    let r = row;
    let c = 0;
    while (r < ROWS && c < COLS) {
      first += board.cells[r][c];
      second += board.cells[ROWS - r - 1][c];
      r += 1;
      c += 1;
    }
    first += "\n";
  }
  for (let col = 0; col < COLS; col++) {
    let r = 0;
    let c = col;
    while (r < ROWS && c < COLS) {
      first += board.cells[r][c];
      second += board.cells[ROWS - r - 1][c];
      r += 1;
      c += 1;
    }
  }
  return { first, second };
}

export function checkLineDiag(board, size) {
  const { first, second } = diagonalStrings(board);
  const red = repeat(RED, size);
  const yellow = repeat(YELLOW, size);
  const found = {
    count1: substringSearch(first, red) + substringSearch(second, red),
    count2: substringSearch(first, yellow) + substringSearch(second, yellow),
  };
  return { hit: found.count1 !== 0 || found.count2 !== 0, ...found };
}

function winStrings(board) {
  let first = "";
  let second = "";
  for (let row = 0; row < ROWS; row++) {
    let r = row;
    let c = 0;
    while (r < ROWS && c < COLS) {
      first += board.cells[r][c];
      second += board.cells[ROWS - r - 1][c];
      r += 1;
      c += 1;
    }
    first += "\n";
    second += "\n";
  }
  for (let col = 0; col < COLS; col++) {
    let r = 0;
    let c = col;
    while (r < ROWS && c < COLS) {
      first += board.cells[r][c];
      second += board.cells[ROWS - r - 1][c];
      r += 1;
      c += 1;
    }
    first += "\n";
    second += "\n";
  }
  return { first, second };
}

export function stringWin(board) {
  const fourRed = repeat(RED, 4);
  const fourYellow = repeat(YELLOW, 4);
  if (rowString(board).includes(fourRed) || rowString(board).includes(fourYellow)) return true;
  if (colString(board).includes(fourRed) || colString(board).includes(fourYellow)) return true;
  const { first, second } = winStrings(board);
  return (
    first.includes(fourRed) ||
    first.includes(fourYellow) ||
    second.includes(fourRed) ||
    second.includes(fourYellow)
  );
}

function addScore(score, found, ownWeight, oppWeight, redTurn) {
  if (!found.hit) return score;
  if (redTurn) return score - oppWeight * found.count2 + ownWeight * found.count1;
  return score - oppWeight * found.count1 + ownWeight * found.count2;
}

export function scoreBoard(board, col, liveTurn) {
  const redTurn = liveTurn % 2 === 0;
  let score = 0;
  score = addScore(score, checkLineHorizontal(board, 4), 0, 500, redTurn);
  score = addScore(score, checkLineVertical(board, 4), 0, 500, redTurn);
  score = addScore(score, checkLineDiag(board, 4), 0, 500, redTurn);
  score = addScore(score, checkLineWinnableHorizontal(board, 3), 5, 50, redTurn);
  score = addScore(score, checkLineHorizontal(board, 3), 3, 30, redTurn);
  score = addScore(score, checkLineVertical(board, 3), 5, 50, redTurn);
  score = addScore(score, checkLineDiag(board, 3), 5, 50, redTurn);
  score = addScore(score, checkLineHorizontal(board, 2), 2, 2, redTurn);
  score = addScore(score, checkLineVertical(board, 2), 2, 2, redTurn);
  score = addScore(score, checkLineDiag(board, 2), 2, 2, redTurn);
  if (col === 3) score += redTurn ? 1 : -1;
  return score;
}

export function chooseCol(live, aiTurn, { fixReset = false } = {}) {
  let simulation = copyBoard(live, aiTurn);
  let max = JAVA_MIN;
  let index = 0;
  const mins = Array(COLS).fill(null);

  for (let i = 0; i < COLS; i++) {
    let min = JAVA_MAX;
    for (let j = 0; j < COLS; j++) {
      if (fixReset) simulation = copyBoard(live, aiTurn);
      if (!fullBoard(simulation) && !fullCol(live, i)) {
        dropDisc(simulation, i);
        if (stringWin(simulation)) {
          mins[i] = "win";
          return { col: i, mins, immediate: true, value: null };
        }
      } else {
        continue;
      }
      if (!fullBoard(simulation) && !fullCol(live, j)) dropDisc(simulation, j);
      else continue;
      const score = scoreBoard(simulation, i, live.turn);
      if (score <= min) min = score;
      simulation = copyBoard(live, aiTurn);
    }
    mins[i] = fullCol(live, i) ? null : min;
    if (min > max && !fullCol(live, i)) {
      max = min;
      index = i;
    }
  }
  return { col: index, mins, immediate: false, value: max };
}
