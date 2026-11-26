import { describe, expect, it } from 'vitest';
import {
  assignBlankTile,
  createNewGame,
  placeTileOnBoard,
  type GameState,
  type TileLetter,
} from './game';
import { evaluatePendingTurn, submitTurn } from './scrabbleRules';

type FixedTile = {
  letter: Exclude<TileLetter, 'blank'>;
  row: number;
  column: number;
};

function gameWithTiles(rackLetters: TileLetter[], fixedTiles: FixedTile[] = []): GameState {
  const game = createNewGame(2);
  const availableTiles = [...game.players.flatMap(({ rack }) => rack), ...game.tileBag];
  const takeTile = (letter: TileLetter) => {
    const tileIndex = availableTiles.findIndex((tile) => tile.letter === letter);
    if (tileIndex < 0) {
      throw new Error(`No ${letter} tile is available for the test game.`);
    }

    return availableTiles.splice(tileIndex, 1)[0];
  };
  const rackTiles = rackLetters.map(takeTile);
  const placedTiles = fixedTiles.map(({ letter, row, column }) => ({
    row,
    column,
    tile: takeTile(letter),
  }));
  const currentRack = [...rackTiles, ...availableTiles.splice(0, 7 - rackTiles.length)];
  const nextRack = availableTiles.splice(0, 7);

  return {
    ...game,
    players: [
      { ...game.players[0], rack: currentRack },
      { ...game.players[1], rack: nextRack },
    ],
    tileBag: availableTiles,
    placedTiles,
    pendingTileIds: [],
  };
}

function placeLetters(
  game: GameState,
  letters: TileLetter[],
  row: number,
  startingColumn: number
): GameState {
  let nextGame = game;
  for (const [index, letter] of letters.entries()) {
    const tile = nextGame.players[nextGame.currentPlayerIndex].rack.find(
      (rackTile) => rackTile.letter === letter
    );
    if (!tile) {
      throw new Error(`The test rack does not contain a ${letter} tile.`);
    }

    const placedGame = placeTileOnBoard(nextGame, tile.id, row, startingColumn + index);
    if (!placedGame) {
      throw new Error(`Could not place the ${letter} test tile.`);
    }

    nextGame = placedGame;
  }

  return nextGame;
}

describe('evaluatePendingTurn', () => {
  it('requires a legal opening word through the center and scores the center double word', () => {
    const game = gameWithTiles(['C', 'A', 'T']);
    const validPlay = placeLetters(game, ['C', 'A', 'T'], 7, 6);
    const offCenterPlay = placeLetters(game, ['C', 'A', 'T'], 0, 0);

    expect(evaluatePendingTurn(validPlay)).toEqual({ words: ['cat'], score: 10 });
    expect(evaluatePendingTurn(offCenterPlay)).toBeNull();
    expect(
      evaluatePendingTurn(placeLetters(gameWithTiles(['Q', 'Z']), ['Q', 'Z'], 7, 7))
    ).toBeNull();
  });

  it('rejects gaps and disconnected plays', () => {
    const game = gameWithTiles(['A', 'T']);
    const firstPlacement = placeTileOnBoard(game, game.players[0].rack[0].id, 7, 6);
    if (!firstPlacement) {
      throw new Error('Could not place the first gap-test tile.');
    }
    const gap = placeTileOnBoard(firstPlacement, game.players[0].rack[1].id, 7, 8);
    const disconnectedGame = gameWithTiles(['T'], [{ letter: 'A', row: 7, column: 7 }]);
    const disconnectedTile = disconnectedGame.players[0].rack.find(({ letter }) => letter === 'T');
    if (!disconnectedTile) {
      throw new Error('The disconnected test rack does not contain a T tile.');
    }
    const disconnected = placeTileOnBoard(disconnectedGame, disconnectedTile.id, 0, 0);

    if (!gap || !disconnected) {
      throw new Error('Could not construct the invalid test plays.');
    }

    expect(evaluatePendingTurn(gap)).toBeNull();
    expect(evaluatePendingTurn(disconnected)).toBeNull();
  });

  it('validates and scores every word formed by a cross play', () => {
    const game = gameWithTiles(
      ['T'],
      [
        { letter: 'A', row: 7, column: 2 },
        { letter: 'A', row: 6, column: 3 },
      ]
    );
    const tile = game.players[0].rack.find(({ letter }) => letter === 'T');
    if (!tile) {
      throw new Error('The test rack does not contain a T tile.');
    }
    const play = placeTileOnBoard(game, tile.id, 7, 3);

    if (!play) {
      throw new Error('Could not construct the cross play.');
    }

    expect(evaluatePendingTurn(play)).toEqual({ words: ['at', 'at'], score: 6 });
  });

  it('rejects a play when any cross word is absent from the dictionary', () => {
    const game = gameWithTiles(
      ['T'],
      [
        { letter: 'A', row: 7, column: 2 },
        { letter: 'Q', row: 6, column: 3 },
        { letter: 'Z', row: 8, column: 3 },
      ]
    );
    const tile = game.players[0].rack.find(({ letter }) => letter === 'T');
    if (!tile) {
      throw new Error('The test rack does not contain a T tile.');
    }
    const play = placeTileOnBoard(game, tile.id, 7, 3);

    if (!play) {
      throw new Error('Could not construct the invalid cross play.');
    }

    expect(evaluatePendingTurn(play)).toBeNull();
  });

  it('rejects abbreviation-only cross words', () => {
    const game = gameWithTiles(
      ['F'],
      [
        { letter: 'R', row: 7, column: 6 },
        { letter: 'A', row: 7, column: 7 },
        { letter: 'W', row: 7, column: 8 },
      ]
    );
    const tile = game.players[0].rack.find(({ letter }) => letter === 'F');
    if (!tile) {
      throw new Error('The test rack does not contain an F tile.');
    }
    const play = placeTileOnBoard(game, tile.id, 6, 6);

    if (!play) {
      throw new Error('Could not construct the FR cross word.');
    }

    expect(evaluatePendingTurn(play)).toBeNull();
  });

  it('applies a triple-word premium to the new word', () => {
    const game = gameWithTiles(
      ['S'],
      [
        { letter: 'A', row: 0, column: 1 },
        { letter: 'T', row: 0, column: 2 },
      ]
    );
    const tile = game.players[0].rack.find(({ letter }) => letter === 'S');
    if (!tile) {
      throw new Error('The test rack does not contain an S tile.');
    }
    const play = placeTileOnBoard(game, tile.id, 0, 0);

    if (!play) {
      throw new Error('Could not construct the triple-word play.');
    }

    expect(evaluatePendingTurn(play)).toEqual({ words: ['sat'], score: 9 });
  });

  it('scores a blank as zero and awards the seven-tile bonus', () => {
    const blankGame = placeLetters(gameWithTiles(['C', 'blank', 'T']), ['C', 'blank', 'T'], 7, 6);
    const blank = blankGame.placedTiles.find(({ tile }) => tile.letter === 'blank');
    if (!blank) {
      throw new Error('The test play does not contain a blank tile.');
    }
    const assignedBlank = assignBlankTile(blankGame, blank.tile.id, 'A');

    if (!assignedBlank) {
      throw new Error('Could not assign the blank test tile.');
    }

    expect(evaluatePendingTurn(assignedBlank)).toEqual({ words: ['cat'], score: 8 });

    const bingo = placeLetters(
      gameWithTiles(['J', 'U', 'M', 'P', 'I', 'N', 'G']),
      ['J', 'U', 'M', 'P', 'I', 'N', 'G'],
      7,
      4
    );
    expect(evaluatePendingTurn(bingo)).toEqual({ words: ['jumping'], score: 88 });
  });
});

describe('submitTurn', () => {
  it('awards the word score, refills the rack, and advances to the next player', () => {
    const game = placeLetters(gameWithTiles(['C', 'A', 'T']), ['C', 'A', 'T'], 7, 6);
    const nextGame = submitTurn(game);

    expect(nextGame?.players[0].score).toBe(10);
    expect(nextGame?.players[0].rack).toHaveLength(7);
    expect(nextGame?.currentPlayerIndex).toBe(1);
    expect(nextGame?.pendingTileIds).toEqual([]);
    expect(submitTurn({ ...game, pendingTileIds: [] })).toBeNull();
  });
});
