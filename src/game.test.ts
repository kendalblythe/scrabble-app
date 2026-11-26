import { afterEach, describe, expect, it, vi } from 'vitest';
import { createNewGame, TILE_DISTRIBUTION } from './game';

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
