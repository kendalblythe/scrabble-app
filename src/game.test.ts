import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createNewGame,
  isGameState,
  movePendingTileOnBoard,
  normalizeGameState,
  placeTileOnBoard,
  reorderRackTile,
  returnPendingTileToRack,
  TILE_DISTRIBUTION,
} from './game';

afterEach(() => vi.restoreAllMocks());

describe('createNewGame', () => {
  it.each([
    { playerCount: 2 as const, expectedBagSize: 86 },
    { playerCount: 3 as const, expectedBagSize: 79 },
    { playerCount: 4 as const, expectedBagSize: 72 },
  ])('deals seven tiles to each of $playerCount players', ({ playerCount, expectedBagSize }) => {
    const game = createNewGame(playerCount);

    expect(game.players).toHaveLength(playerCount);
    expect(game.players.map(({ rack }) => rack)).toHaveLength(playerCount);
    expect(game.players.every(({ rack }) => rack.length === 7)).toBe(true);
    expect(game.tileBag).toHaveLength(expectedBagSize);
    expect(game.currentPlayerIndex).toBe(0);
    expect(game.players.every(({ score }) => score === 0)).toBe(true);
  });

  it('shuffles the tile bag before dealing', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.5);

    createNewGame(2);

    expect(random).toHaveBeenCalled();
    expect(random).toHaveBeenCalledTimes(
      TILE_DISTRIBUTION.reduce((total, tile) => total + tile.count, 0) - 1
    );
  });
});

describe('placeTileOnBoard', () => {
  it('moves a tile from the current rack into an empty board square', () => {
    const game = createNewGame(2);
    const tile = game.players[game.currentPlayerIndex].rack[0];
    const nextGame = placeTileOnBoard(game, tile.id, 7, 7);

    expect(nextGame?.players[game.currentPlayerIndex].rack).not.toContainEqual(tile);
    expect(nextGame?.placedTiles).toContainEqual({ row: 7, column: 7, tile });
    expect(nextGame?.pendingTileIds).toContain(tile.id);
    expect(game.players[game.currentPlayerIndex].rack).toContainEqual(tile);
  });

  it('does not place a tile in an occupied or out-of-range square', () => {
    const game = createNewGame(2);
    const firstTile = game.players[game.currentPlayerIndex].rack[0];
    const secondTile = game.players[game.currentPlayerIndex].rack[1];
    const gameWithPlacement = placeTileOnBoard(game, firstTile.id, 7, 7);

    expect(gameWithPlacement).not.toBeNull();
    if (!gameWithPlacement) {
      throw new Error('Expected the tile to be placed.');
    }

    expect(placeTileOnBoard(gameWithPlacement, secondTile.id, 7, 7)).toBeNull();
    expect(placeTileOnBoard(game, firstTile.id, 15, 7)).toBeNull();
  });
});

describe('movePendingTileOnBoard', () => {
  it('moves a pending tile to an empty square and rejects locked or occupied tiles', () => {
    const game = createNewGame(2);
    const [movableTile, rackTile] = game.players[game.currentPlayerIndex].rack;
    const withPendingTile = placeTileOnBoard(game, movableTile.id, 7, 7);
    if (!withPendingTile) {
      throw new Error('Expected the tile to be placed.');
    }

    const withFixedTile = {
      ...withPendingTile,
      placedTiles: [
        ...withPendingTile.placedTiles,
        { row: 7, column: 8, tile: withPendingTile.tileBag[0] },
      ],
      tileBag: withPendingTile.tileBag.slice(1),
      pendingTileIds: [movableTile.id],
    };

    const movedGame = movePendingTileOnBoard(withFixedTile, movableTile.id, 6, 7);

    expect(movedGame?.placedTiles).toContainEqual({
      row: 6,
      column: 7,
      tile: movableTile,
    });
    expect(movePendingTileOnBoard(withFixedTile, movableTile.id, 7, 8)).toBeNull();
    expect(movePendingTileOnBoard(withFixedTile, rackTile.id, 5, 5)).toBeNull();
    expect(movePendingTileOnBoard(withFixedTile, movableTile.id, 7, 7)).toBeNull();
  });
});

describe('returnPendingTileToRack', () => {
  it('returns a pending tile at the requested rack position and unlocks it', () => {
    const game = createNewGame(2);
    const [tile, targetTile] = game.players[game.currentPlayerIndex].rack;
    const withPendingTile = placeTileOnBoard(game, tile.id, 7, 7);
    if (!withPendingTile) {
      throw new Error('Expected the tile to be placed.');
    }

    const returnedGame = returnPendingTileToRack(withPendingTile, tile.id, targetTile.id, true);

    expect(returnedGame?.players[game.currentPlayerIndex].rack.slice(0, 2)).toEqual([
      targetTile,
      tile,
    ]);
    expect(returnedGame?.placedTiles).toEqual([]);
    expect(returnedGame?.pendingTileIds).toEqual([]);
    expect(returnPendingTileToRack(withPendingTile, 'missing-tile', null, false)).toBeNull();
  });
});

describe('normalizeGameState', () => {
  it('marks tiles from an older saved game as pending', () => {
    const game = createNewGame(2);
    const tile = game.players[0].rack[0];
    const placedGame = placeTileOnBoard(game, tile.id, 7, 7);
    if (!placedGame) {
      throw new Error('Expected the tile to be placed.');
    }

    const { pendingTileIds: _pendingTileIds, ...legacyGame } = placedGame;

    expect(normalizeGameState(legacyGame)?.pendingTileIds).toEqual([tile.id]);
  });
});

describe('isGameState', () => {
  it('rejects duplicate tile ids across the game', () => {
    const game = createNewGame(2);
    const firstRackTile = game.players[0].rack[0];
    const gameWithDuplicateId = {
      ...game,
      tileBag: [...game.tileBag.slice(1), firstRackTile],
    };

    expect(isGameState(gameWithDuplicateId)).toBe(false);
  });
});

describe('reorderRackTile', () => {
  it('moves a tile after the target tile without mutating the original rack', () => {
    const game = createNewGame(2);
    const originalRack = game.players[game.currentPlayerIndex].rack;
    const tileIds = originalRack.map(({ id }) => id);
    const updatedGame = reorderRackTile(game, tileIds[0], tileIds[2], true);

    expect(updatedGame?.players[game.currentPlayerIndex].rack.map(({ id }) => id)).toEqual([
      tileIds[1],
      tileIds[2],
      tileIds[0],
      ...tileIds.slice(3),
    ]);
    expect(game.players[game.currentPlayerIndex].rack).toBe(originalRack);
  });

  it('appends a tile when no target is provided and ignores invalid or unchanged moves', () => {
    const game = createNewGame(2);
    const tileIds = game.players[game.currentPlayerIndex].rack.map(({ id }) => id);
    const updatedGame = reorderRackTile(game, tileIds[0], null, false);

    expect(updatedGame?.players[game.currentPlayerIndex].rack.map(({ id }) => id)).toEqual([
      ...tileIds.slice(1),
      tileIds[0],
    ]);
    expect(reorderRackTile(game, tileIds[0], tileIds[1], false)).toBeNull();
    expect(reorderRackTile(game, 'missing-tile', null, false)).toBeNull();
  });
});
