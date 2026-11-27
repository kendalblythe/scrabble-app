import { BOARD_SQUARES } from './components/Board/board';
import wordList from './dictionary/word-list.txt?raw';
import { type BoardLetter, type GameState, type PlacedTile, RACK_SIZE } from './game';

type Direction = 'horizontal' | 'vertical';

type WordRun = {
  direction: Direction;
  placements: PlacedTile[];
};

export type TurnResult = {
  words: string[];
  score: number;
};

const dictionary = new Set(wordList.trim().split(/\s+/));
const premiumSquares = new Map(
  BOARD_SQUARES.filter(({ bonus }) => bonus !== undefined).map(({ row, column, bonus }) => [
    `${row}-${column}`,
    bonus,
  ])
);

function squareKey(row: number, column: number) {
  return `${row}-${column}`;
}

function getLetter(placement: PlacedTile): BoardLetter | null {
  return placement.tile.letter === 'blank'
    ? (placement.assignedLetter ?? null)
    : placement.tile.letter;
}

function getWordRun(
  tilesBySquare: Map<string, PlacedTile>,
  placement: PlacedTile,
  direction: Direction
): WordRun {
  const rowStep = direction === 'vertical' ? 1 : 0;
  const columnStep = direction === 'horizontal' ? 1 : 0;
  let { row, column } = placement;

  while (tilesBySquare.has(squareKey(row - rowStep, column - columnStep))) {
    row -= rowStep;
    column -= columnStep;
  }

  const placements: PlacedTile[] = [];
  while (true) {
    const current = tilesBySquare.get(squareKey(row, column));
    if (!current) {
      break;
    }

    placements.push(current);
    row += rowStep;
    column += columnStep;
  }

  return { direction, placements };
}

function hasContinuousPlacement(
  pendingTiles: PlacedTile[],
  tilesBySquare: Map<string, PlacedTile>
): boolean {
  if (pendingTiles.length < 2) {
    return true;
  }

  const rows = new Set(pendingTiles.map(({ row }) => row));
  const columns = new Set(pendingTiles.map(({ column }) => column));
  if (rows.size !== 1 && columns.size !== 1) {
    return false;
  }

  const isHorizontal = rows.size === 1;
  const line = isHorizontal
    ? pendingTiles.map(({ column }) => column)
    : pendingTiles.map(({ row }) => row);
  const start = Math.min(...line);
  const end = Math.max(...line);
  const fixedCoordinate = isHorizontal ? pendingTiles[0].row : pendingTiles[0].column;

  for (let coordinate = start; coordinate <= end; coordinate += 1) {
    const row = isHorizontal ? fixedCoordinate : coordinate;
    const column = isHorizontal ? coordinate : fixedCoordinate;
    if (!tilesBySquare.has(squareKey(row, column))) {
      return false;
    }
  }

  return true;
}

function getFormedWords(
  pendingTiles: PlacedTile[],
  tilesBySquare: Map<string, PlacedTile>,
  isFirstPlay: boolean
): WordRun[] {
  const runs = new Map<string, WordRun>();

  for (const placement of pendingTiles) {
    for (const direction of ['horizontal', 'vertical'] as const) {
      const run = getWordRun(tilesBySquare, placement, direction);
      if (run.placements.length > 1) {
        const firstPlacement = run.placements[0];
        runs.set(`${direction}:${firstPlacement.row}-${firstPlacement.column}`, run);
      }
    }
  }

  if (runs.size === 0 && isFirstPlay && pendingTiles.length === 1) {
    runs.set('single', { direction: 'horizontal', placements: pendingTiles });
  }

  return [...runs.values()];
}

function getWordScore(placements: PlacedTile[], pendingTileIds: Set<string>): number {
  let wordMultiplier = 1;
  const letterScore = placements.reduce((total, placement) => {
    let points = placement.tile.points;
    if (!pendingTileIds.has(placement.tile.id)) {
      return total + points;
    }

    const bonus = premiumSquares.get(squareKey(placement.row, placement.column));
    if (bonus === 'double-letter') {
      points *= 2;
    } else if (bonus === 'triple-letter') {
      points *= 3;
    } else if (bonus === 'double-word' || bonus === 'center') {
      wordMultiplier *= 2;
    } else if (bonus === 'triple-word') {
      wordMultiplier *= 3;
    }

    return total + points;
  }, 0);

  return letterScore * wordMultiplier;
}

export function evaluatePendingTurn(game: GameState): TurnResult | null {
  if (game.pendingTileIds.length === 0) {
    return null;
  }

  const pendingTileIds = new Set(game.pendingTileIds);
  const pendingTiles = game.placedTiles.filter(({ tile }) => pendingTileIds.has(tile.id));
  if (pendingTiles.length !== pendingTileIds.size) {
    return null;
  }

  const fixedTiles = game.placedTiles.filter(({ tile }) => !pendingTileIds.has(tile.id));
  const isFirstPlay = fixedTiles.length === 0;
  const tilesBySquare = new Map(
    game.placedTiles.map((placement) => [squareKey(placement.row, placement.column), placement])
  );

  if (
    !hasContinuousPlacement(pendingTiles, tilesBySquare) ||
    (isFirstPlay && !pendingTiles.some(({ row, column }) => row === 7 && column === 7))
  ) {
    return null;
  }

  if (!isFirstPlay) {
    const fixedSquares = new Set(fixedTiles.map(({ row, column }) => squareKey(row, column)));
    const connectsToBoard = pendingTiles.some(({ row, column }) =>
      [
        [row - 1, column],
        [row + 1, column],
        [row, column - 1],
        [row, column + 1],
      ].some(([adjacentRow, adjacentColumn]) =>
        fixedSquares.has(squareKey(adjacentRow, adjacentColumn))
      )
    );

    if (!connectsToBoard) {
      return null;
    }
  }

  const formedWords = getFormedWords(pendingTiles, tilesBySquare, isFirstPlay);
  if (formedWords.length === 0) {
    return null;
  }

  const words: string[] = [];
  let score = 0;
  for (const { placements } of formedWords) {
    const letters = placements.map(getLetter);
    if (letters.some((letter) => letter === null)) {
      return null;
    }

    const word = letters.join('').toLowerCase();
    if (!dictionary.has(word)) {
      return null;
    }

    words.push(word);
    score += getWordScore(placements, pendingTileIds);
  }

  if (pendingTiles.length === RACK_SIZE) {
    score += 50;
  }

  return { words, score };
}

export function submitTurn(game: GameState): GameState | null {
  const result = evaluatePendingTurn(game);
  if (!result) {
    return null;
  }

  const activePlayer = game.players[game.currentPlayerIndex];
  const drawCount = Math.min(RACK_SIZE - activePlayer.rack.length, game.tileBag.length);
  const nextPlayers = game.players.map((player, index) =>
    index === game.currentPlayerIndex
      ? {
          ...player,
          score: player.score + result.score,
          rack: [...player.rack, ...game.tileBag.slice(0, drawCount)],
        }
      : player
  );

  return {
    ...game,
    players: nextPlayers,
    currentPlayerIndex: (game.currentPlayerIndex + 1) % game.players.length,
    tileBag: game.tileBag.slice(drawCount),
    pendingTileIds: [],
  };
}
