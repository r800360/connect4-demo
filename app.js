import { chooseCol, fromCells as toText } from "./engine/heuristic.js";
import {
  RED,
  YELLOW,
  colorToMove,
  drop,
  fromMoves,
  isDraw,
  legalMoves,
  winner,
  winningCells,
} from "./engine/rules.js";
import { chooseSearch } from "./engine/search.js";

const POSITIONS = {
  start: { moves: [], text: "Depth 8 opens in column 2. Depth 10 opens in 3. The 2022 heuristic opens in 3." },
  block: { moves: [3, 0, 3, 0, 4, 0], text: "Yellow has three in column 0. Every engine blocks." },
  trap: { moves: [3, 1, 6, 4, 2, 5, 6, 3, 3, 4, 4], text: "Column 2 makes two winning replies. 2022 plays 0. Search plays 2." },
  reset: { moves: [6, 2, 6, 1, 6, 0, 3, 6, 6, 6], text: "Column 6 is full. 2022 plays 5. The fixed copy plays 3." },
};

const boardEl = document.querySelector("#board");
const ticksEl = document.querySelector("#ticks");
const scoresEl = document.querySelector("#scores");
const scoreLabel = document.querySelector("#score-label");
const statusEl = document.querySelector("#status");
const blurbEl = document.querySelector("#blurb");
const useBtn = document.querySelector("#use");

let board = fromMoves([]);
let engine = "search";
let depth = 8;
let human = RED;
let advise = null;
let busy = false;
let hover = null;

function name(color) {
  return color === RED ? "Red" : "Yellow";
}

function over() {
  const who = winner(board);
  if (who === RED || who === YELLOW) return `${name(who)} connects four.`;
  if (isDraw(board)) return "Draw.";
  return "";
}

function compute() {
  const text = toText(board.cells, board.turn);
  const side = board.turn % 2;
  return {
    old: chooseCol(text, side),
    fixed: chooseCol(text, side, { fixReset: true }),
    search: chooseSearch(board, depth),
  };
}

function selectedCol(advice) {
  if (engine === "fixed") return advice.fixed.col;
  if (engine === "search") return advice.search.col;
  return advice.old.col;
}

function scoreText(score) {
  if (score > 50000) return "win";
  if (score < -50000) return "loss";
  return String(score);
}

function statusText(advice) {
  const done = over();
  if (done) return done;
  const side = `${name(colorToMove(board))} to move.`;
  if (engine === "two" || !advice) return side;
  const search = `${advice.search.col} (${scoreText(advice.search.score)}, depth ${depth})`;
  return `${side} 2022: ${advice.old.col}. Fixed: ${advice.fixed.col}. Search: ${search}.`;
}

function shownMins(advice) {
  if (!advice || engine === "two") return null;
  return engine === "fixed" ? advice.fixed.mins : advice.old.mins;
}

function render() {
  const done = over();
  const wins = new Set(winningCells(board).map(([row, col]) => `${row},${col}`));
  const pick = advise && !done ? selectedCol(advise) : null;
  const mins = shownMins(advise);
  const bestScore = mins && advise ? (engine === "fixed" ? advise.fixed.col : advise.old.col) : null;
  ticksEl.replaceChildren();
  scoresEl.replaceChildren();
  boardEl.replaceChildren();

  for (let col = 0; col < 7; col++) {
    const tick = document.createElement("div");
    tick.className = "tick" + (col === pick ? " pick" : "");
    tick.textContent = String(col);
    ticksEl.append(tick);

    const score = document.createElement("div");
    score.className = "score" + (col === bestScore ? " pick" : "");
    if (!mins) score.textContent = "";
    else if (mins[col] === null) score.textContent = "full";
    else score.textContent = String(mins[col]);
    scoresEl.append(score);
  }

  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 7; col++) {
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "cell";
      cell.dataset.row = String(row);
      cell.dataset.col = String(col);
      const value = board.cells[row][col];
      if (value === RED) cell.classList.add("red");
      else if (value === YELLOW) cell.classList.add("yellow");
      if (wins.has(`${row},${col}`)) cell.classList.add("win");
      const yours = !done && (engine === "two" || colorToMove(board) === human);
      cell.disabled = !yours || board.cells[0][col] !== 0;
      cell.setAttribute("aria-label", `Column ${col}`);
      cell.addEventListener("click", () => humanPlay(col));
      boardEl.append(cell);
    }
  }

  scoreLabel.textContent = mins ? (engine === "fixed" ? "Fixed worst reply. Higher is better." : "2022 worst reply. Higher is better.") : "";
  statusEl.textContent = statusText(advise);
  useBtn.hidden = engine === "two" || Boolean(done);
  paintGhost();
  press("[data-engine]", engine, "data-engine");
  press("[data-depth]", String(depth), "data-depth");
  press("[data-seat]", String(human), "data-seat");
}

function press(selector, value, attr) {
  for (const button of document.querySelectorAll(selector)) {
    button.setAttribute("aria-pressed", button.getAttribute(attr) === value ? "true" : "false");
  }
}

function step() {
  busy = false;
  const done = over();
  if (done || engine === "two") {
    advise = null;
    render();
    return;
  }
  advise = compute();
  if (colorToMove(board) !== human) {
    drop(board, selectedCol(advise));
    advise = over() ? null : compute();
  }
  render();
}

function humanPlay(col) {
  if (busy || over()) return;
  if (engine !== "two" && colorToMove(board) !== human) return;
  if (!legalMoves(board).includes(col)) return;
  busy = true;
  hover = null;
  drop(board, col);
  advise = null;
  render();
  setTimeout(step, 180);
}

function load(name) {
  const position = POSITIONS[name];
  board = fromMoves(position.moves);
  human = colorToMove(board);
  hover = null;
  advise = null;
  blurbEl.textContent = position.text;
  render();
  busy = true;
  setTimeout(step, 180);
}

document.querySelectorAll("[data-engine]").forEach((button) => {
  button.addEventListener("click", () => {
    engine = button.dataset.engine;
    step();
  });
});

document.querySelectorAll("[data-depth]").forEach((button) => {
  button.addEventListener("click", () => {
    depth = Number(button.dataset.depth);
    if (!over() && engine !== "two") {
      advise = compute();
      render();
    } else render();
  });
});

document.querySelectorAll("[data-seat]").forEach((button) => {
  button.addEventListener("click", () => {
    human = Number(button.dataset.seat);
    step();
  });
});

document.querySelectorAll("[data-pos]").forEach((button) => {
  button.addEventListener("click", () => load(button.dataset.pos));
});

useBtn.addEventListener("click", () => {
  if (!advise || over() || engine === "two") return;
  humanPlay(selectedCol(advise));
});

function paintGhost() {
  for (const cell of boardEl.querySelectorAll(".cell")) {
    cell.classList.remove("ghost-red", "ghost-yellow");
  }
  if (hover === null || over()) return;
  if (engine !== "two" && colorToMove(board) !== human) return;
  for (let row = 5; row >= 0; row--) {
    if (board.cells[row][hover] === 0) {
      const cell = boardEl.querySelector(`[data-row="${row}"][data-col="${hover}"]`);
      cell?.classList.add(human === RED ? "ghost-red" : "ghost-yellow");
      break;
    }
  }
}

boardEl.addEventListener("pointermove", (event) => {
  const cell = event.target.closest?.(".cell");
  const next = cell ? Number(cell.dataset.col) : null;
  if (next === hover) return;
  hover = next;
  paintGhost();
});

boardEl.addEventListener("pointerleave", () => {
  hover = null;
  paintGhost();
});

document.addEventListener("keydown", (event) => {
  if (event.key >= "0" && event.key <= "6") humanPlay(Number(event.key));
});

load("start");
