export const PLAYER_COUNTS = [2, 3, 4] as const;
export const RACK_SIZE = 7;
export const GAME_STORAGE_KEY = 'scrabble-current-game';

export const TILE_DISTRIBUTION = [
  { letter: 'A', count: 9, points: 1 },
  { letter: 'B', count: 2, points: 3 },
  { letter: 'C', count: 2, points: 3 },
  { letter: 'D', count: 4, points: 2 },
  { letter: 'E', count: 12, points: 1 },
  { letter: 'F', count: 2, points: 4 },
  { letter: 'G', count: 3, points: 2 },
  { letter: 'H', count: 2, points: 4 },
  { letter: 'I', count: 9, points: 1 },
  { letter: 'J', count: 1, points: 8 },
  { letter: 'K', count: 1, points: 5 },
  { letter: 'L', count: 4, points: 1 },
  { letter: 'M', count: 2, points: 3 },
  { letter: 'N', count: 6, points: 1 },
  { letter: 'O', count: 8, points: 1 },
  { letter: 'P', count: 2, points: 3 },
  { letter: 'Q', count: 1, points: 10 },
  { letter: 'R', count: 6, points: 1 },
  { letter: 'S', count: 4, points: 1 },
  { letter: 'T', count: 6, points: 1 },
  { letter: 'U', count: 4, points: 1 },
  { letter: 'V', count: 2, points: 4 },
  { letter: 'W', count: 2, points: 4 },
  { letter: 'X', count: 1, points: 8 },
  { letter: 'Y', count: 2, points: 4 },
  { letter: 'Z', count: 1, points: 10 },
  { letter: 'blank', count: 2, points: 0 },
] as const;

export type PlayerCount = (typeof PLAYER_COUNTS)[number];
export type TileLetter = (typeof TILE_DISTRIBUTION)[number]['letter'];
export type BoardLetter = Exclude<TileLetter, 'blank'>;
export const BOARD_LETTERS = TILE_DISTRIBUTION.map(({ letter }) => letter).filter(
  (letter): letter is BoardLetter => letter !== 'blank'
);

export type Tile = {
  id: string;
  letter: TileLetter;
  points: number;
};

export type Player = {
  id: number;
  score: number;
  rack: Tile[];
};

export type PlacedTile = {
  row: number;
  column: number;
  tile: Tile;
  assignedLetter?: BoardLetter;
};

export type GameState = {
  players: Player[];
  currentPlayerIndex: number;
  tileBag: Tile[];
  placedTiles: PlacedTile[];
  pendingTileIds: string[];
};

const TOTAL_TILE_COUNT = TILE_DISTRIBUTION.reduce((total, tile) => total + tile.count, 0);

export function isPlayerCount(value: unknown): value is PlayerCount {
  return value === 2 || value === 3 || value === 4;
}

function isTile(value: unknown): value is Tile {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('id' in value) ||
    !('letter' in value) ||
    !('points' in value) ||
    typeof value.id !== 'string' ||
    typeof value.points !== 'number'
  ) {
    return false;
  }

  return TILE_DISTRIBUTION.some(
    ({ letter, points }) => letter === value.letter && points === value.points
  );
}

function isPlayer(value: unknown): value is Player {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('id' in value) ||
    !('score' in value) ||
    !('rack' in value) ||
    typeof value.id !== 'number' ||
    !Number.isInteger(value.id) ||
    typeof value.score !== 'number' ||
    !Number.isInteger(value.score) ||
    value.score < 0 ||
    !Array.isArray(value.rack) ||
    value.rack.length > RACK_SIZE
  ) {
    return false;
  }

  return value.rack.every(isTile);
}

function isBoardLetter(value: unknown): value is BoardLetter {
  return BOARD_LETTERS.some((letter) => letter === value);
}

function isPlacedTile(value: unknown): value is PlacedTile {
  if (
    typeof value === 'object' &&
    value !== null &&
    'row' in value &&
    'column' in value &&
    'tile' in value &&
    typeof value.row === 'number' &&
    Number.isInteger(value.row) &&
    value.row >= 0 &&
    value.row < 15 &&
    typeof value.column === 'number' &&
    Number.isInteger(value.column) &&
    value.column >= 0 &&
    value.column < 15 &&
    isTile(value.tile)
  ) {
    if (!('assignedLetter' in value) || value.assignedLetter === undefined) {
      return true;
    }

    return value.tile.letter === 'blank' && isBoardLetter(value.assignedLetter);
  }

  return false;
}

export function isGameState(value: unknown): value is GameState {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('players' in value) ||
    !('currentPlayerIndex' in value) ||
    !('tileBag' in value) ||
    !Array.isArray(value.players) ||
    value.players.length < 2 ||
    value.players.length > 4 ||
    !value.players.every(isPlayer) ||
    typeof value.currentPlayerIndex !== 'number' ||
    !Number.isInteger(value.currentPlayerIndex) ||
    value.currentPlayerIndex < 0 ||
    value.currentPlayerIndex >= value.players.length ||
    !Array.isArray(value.tileBag) ||
    !value.tileBag.every(isTile) ||
    !('placedTiles' in value) ||
    !Array.isArray(value.placedTiles) ||
    !value.placedTiles.every(isPlacedTile) ||
    !('pendingTileIds' in value) ||
    !Array.isArray(value.pendingTileIds) ||
    !value.pendingTileIds.every((tileId) => typeof tileId === 'string')
  ) {
    return false;
  }

  const placedSquareCount = new Set(value.placedTiles.map(({ row, column }) => `${row}-${column}`))
    .size;
  if (placedSquareCount !== value.placedTiles.length) {
    return false;
  }

  const pendingTileIds = new Set(value.pendingTileIds);
  const placedTileIds = new Set(value.placedTiles.map(({ tile }) => tile.id));
  if (
    pendingTileIds.size !== value.pendingTileIds.length ||
    !value.pendingTileIds.every((tileId) => placedTileIds.has(tileId))
  ) {
    return false;
  }

  const rackTileCount = value.players.reduce(
    (total, player) => total + (isPlayer(player) ? player.rack.length : 0),
    0
  );
  const tileIds = [
    ...value.players.flatMap((player) => (isPlayer(player) ? player.rack.map(({ id }) => id) : [])),
    ...value.tileBag.flatMap((tile) => (isTile(tile) ? [tile.id] : [])),
    ...value.placedTiles.flatMap((placedTile) =>
      isPlacedTile(placedTile) ? [placedTile.tile.id] : []
    ),
  ];

  return (
    value.tileBag.length + rackTileCount + value.placedTiles.length === TOTAL_TILE_COUNT &&
    new Set(tileIds).size === TOTAL_TILE_COUNT
  );
}

function getPlacedTileIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((placedTile) => {
    if (
      typeof placedTile !== 'object' ||
      placedTile === null ||
      !('tile' in placedTile) ||
      typeof placedTile.tile !== 'object' ||
      placedTile.tile === null ||
      !('id' in placedTile.tile) ||
      typeof placedTile.tile.id !== 'string'
    ) {
      return [];
    }

    return [placedTile.tile.id];
  });
}

export function normalizeGameState(value: unknown): GameState | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }

  const placedTiles = 'placedTiles' in value ? value.placedTiles : [];
  const pendingTileIds =
    'pendingTileIds' in value ? value.pendingTileIds : getPlacedTileIds(placedTiles);
  const game = { ...value, placedTiles, pendingTileIds };

  return isGameState(game) ? game : null;
}

function shuffleTiles(tiles: Tile[]): Tile[] {
  for (let index = tiles.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [tiles[index], tiles[swapIndex]] = [tiles[swapIndex], tiles[index]];
  }

  return tiles;
}

export function createNewGame(playerCount: PlayerCount): GameState {
  const tileBag = shuffleTiles(
    TILE_DISTRIBUTION.flatMap(({ letter, count, points }) =>
      Array.from({ length: count }, (_, index) => ({
        id: `${letter}-${index}`,
        letter,
        points,
      }))
    )
  );
  const players = Array.from({ length: playerCount }, (_, index) => ({
    id: index + 1,
    score: 0,
    rack: tileBag.splice(0, RACK_SIZE),
  }));

  return { players, currentPlayerIndex: 0, tileBag, placedTiles: [], pendingTileIds: [] };
}

export function placeTileOnBoard(
  game: GameState,
  tileId: string,
  row: number,
  column: number
): GameState | null {
  if (
    !Number.isInteger(row) ||
    row < 0 ||
    row >= 15 ||
    !Number.isInteger(column) ||
    column < 0 ||
    column >= 15 ||
    game.placedTiles.some((placedTile) => placedTile.row === row && placedTile.column === column)
  ) {
    return null;
  }

  const currentPlayer = game.players[game.currentPlayerIndex];
  const rackIndex = currentPlayer.rack.findIndex((rackTile) => rackTile.id === tileId);
  if (rackIndex < 0) {
    return null;
  }
  const tile = currentPlayer.rack[rackIndex];

  return {
    ...game,
    players: game.players.map((player, index) =>
      index === game.currentPlayerIndex
        ? { ...player, rack: player.rack.filter((rackTile) => rackTile.id !== tileId) }
        : player
    ),
    placedTiles: [...game.placedTiles, { row, column, tile }],
    pendingTileIds: [...game.pendingTileIds, tileId],
  };
}

export function assignBlankTile(
  game: GameState,
  tileId: string,
  letter: BoardLetter
): GameState | null {
  const placedTile = game.placedTiles.find(({ tile }) => tile.id === tileId);
  if (!placedTile) {
    return null;
  }

  if (
    placedTile.tile.letter !== 'blank' ||
    placedTile.assignedLetter !== undefined ||
    !game.pendingTileIds.includes(tileId) ||
    !isBoardLetter(letter)
  ) {
    return null;
  }

  return {
    ...game,
    placedTiles: game.placedTiles.map((currentTile) =>
      currentTile.tile.id === tileId ? { ...currentTile, assignedLetter: letter } : currentTile
    ),
  };
}

export function movePendingTileOnBoard(
  game: GameState,
  tileId: string,
  row: number,
  column: number
): GameState | null {
  const placedTile = game.placedTiles.find(({ tile }) => tile.id === tileId);
  if (
    !placedTile ||
    !game.pendingTileIds.includes(tileId) ||
    !Number.isInteger(row) ||
    row < 0 ||
    row >= 15 ||
    !Number.isInteger(column) ||
    column < 0 ||
    column >= 15 ||
    (placedTile.row === row && placedTile.column === column) ||
    game.placedTiles.some((otherTile) => otherTile.row === row && otherTile.column === column)
  ) {
    return null;
  }

  return {
    ...game,
    placedTiles: game.placedTiles.map((currentTile) =>
      currentTile.tile.id === tileId ? { ...currentTile, row, column } : currentTile
    ),
  };
}

export function returnPendingTileToRack(
  game: GameState,
  tileId: string,
  targetTileId: string | null,
  insertAfter: boolean
): GameState | null {
  const placedTile = game.placedTiles.find(({ tile }) => tile.id === tileId);
  if (!placedTile || !game.pendingTileIds.includes(tileId)) {
    return null;
  }

  const rack = game.players[game.currentPlayerIndex].rack;
  if (rack.length >= RACK_SIZE) {
    return null;
  }

  const targetIndex =
    targetTileId === null ? rack.length : rack.findIndex((tile) => tile.id === targetTileId);
  if (targetIndex < 0) {
    return null;
  }

  const insertionIndex = targetIndex + (targetTileId !== null && insertAfter ? 1 : 0);
  const nextRack = [...rack];
  nextRack.splice(insertionIndex, 0, placedTile.tile);

  return {
    ...game,
    players: game.players.map((player, index) =>
      index === game.currentPlayerIndex ? { ...player, rack: nextRack } : player
    ),
    placedTiles: game.placedTiles.filter((tile) => tile.tile.id !== tileId),
    pendingTileIds: game.pendingTileIds.filter((pendingTileId) => pendingTileId !== tileId),
  };
}

export function returnAllPendingTilesToRack(game: GameState): GameState | null {
  if (game.pendingTileIds.length === 0) {
    return null;
  }

  let nextGame = game;
  for (const tileId of game.pendingTileIds) {
    const returnedGame = returnPendingTileToRack(nextGame, tileId, null, false);
    if (!returnedGame) {
      return null;
    }

    nextGame = returnedGame;
  }

  return nextGame;
}

export function reorderRackTile(
  game: GameState,
  tileId: string,
  targetTileId: string | null,
  insertAfter: boolean
): GameState | null {
  const rack = game.players[game.currentPlayerIndex].rack;
  const draggedTile = rack.find((tile) => tile.id === tileId);
  if (!draggedTile) {
    return null;
  }

  const remainingTiles = rack.filter((tile) => tile.id !== tileId);
  const targetIndex =
    targetTileId === null
      ? remainingTiles.length
      : remainingTiles.findIndex((tile) => tile.id === targetTileId);
  if (targetIndex < 0) {
    return null;
  }

  const insertionIndex = targetIndex + (targetTileId !== null && insertAfter ? 1 : 0);
  const nextRack = [...remainingTiles];
  nextRack.splice(insertionIndex, 0, draggedTile);
  if (nextRack.every((tile, index) => tile.id === rack[index]?.id)) {
    return null;
  }

  return {
    ...game,
    players: game.players.map((player, index) =>
      index === game.currentPlayerIndex ? { ...player, rack: nextRack } : player
    ),
  };
}
