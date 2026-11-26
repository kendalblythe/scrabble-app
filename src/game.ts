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

export type GameState = {
  players: Player[];
  currentPlayerIndex: number;
  tileBag: Tile[];
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
    !value.tileBag.every(isTile)
  ) {
    return false;
  }

  const rackTileCount = value.players.reduce(
    (total, player) => total + (isPlayer(player) ? player.rack.length : 0),
    0
  );

  return value.tileBag.length + rackTileCount === TOTAL_TILE_COUNT;
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

  return { players, currentPlayerIndex: 0, tileBag };
}
