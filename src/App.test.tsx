// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import App from './App';
import {
  createNewGame,
  GAME_STORAGE_KEY,
  isGameState,
  TILE_DISTRIBUTION,
  type GameState,
  type TileLetter,
} from './game';

afterEach(cleanup);
beforeEach(() => localStorage.clear());

function gameWithRackLetters(letters: TileLetter[]): GameState {
  const game = createNewGame(2);
  const availableTiles = [...game.players.flatMap(({ rack }) => rack), ...game.tileBag];
  const rackTiles = letters.map((letter) => {
    const tileIndex = availableTiles.findIndex((tile) => tile.letter === letter);
    if (tileIndex < 0) {
      throw new Error(`No ${letter} tile is available for the test game.`);
    }

    return availableTiles.splice(tileIndex, 1)[0];
  });
  const currentRack = [...rackTiles, ...availableTiles.splice(0, 7 - rackTiles.length)];
  const nextRack = availableTiles.splice(0, 7);

  return {
    ...game,
    players: [
      { ...game.players[0], rack: currentRack },
      { ...game.players[1], rack: nextRack },
    ],
    tileBag: availableTiles,
  };
}

describe('App', () => {
  it('enables valid plays and ends the turn with the correct score', () => {
    localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify(gameWithRackLetters(['C', 'A', 'T'])));
    render(<App />);

    const rack = within(screen.getByRole('region', { name: 'P1 rack' })).getByRole('list');
    let draggedTileId = '';
    const dataTransfer = {
      effectAllowed: 'none',
      getData: () => draggedTileId,
      setData: (_format: string, value: string) => {
        draggedTileId = value;
      },
      setDragImage: () => {},
    };
    const placeRackTile = (letter: string, row: number, column: number) => {
      const tile = within(rack).getAllByRole('listitem', {
        name: `${letter}, ${letter === 'C' ? 3 : 1} points`,
      })[0];
      if (!tile) {
        throw new Error(`The test rack does not contain a ${letter} tile.`);
      }

      fireEvent.dragStart(tile, { dataTransfer });
      fireEvent.drop(
        screen.getByRole('cell', { name: new RegExp(`^Row ${row}, column ${column}`) }),
        { dataTransfer }
      );
    };

    placeRackTile('C', 8, 7);
    expect(
      screen
        .getByRole('button', { name: 'Play word, valid play required' })
        .hasAttribute('disabled')
    ).toBe(true);
    placeRackTile('A', 8, 8);
    placeRackTile('T', 8, 9);

    const playButton = screen.getByRole('button', {
      name: 'Play word for 10 points and end turn',
    });
    expect(playButton.hasAttribute('disabled')).toBe(false);
    expect(playButton.textContent).toBe('Play (+10)');
    fireEvent.click(playButton);

    expect(screen.getByRole('heading', { name: 'P2 rack' })).toBeTruthy();
    expect(screen.getByRole('listitem', { name: 'Player 1, 10 points' })).toBeTruthy();
    expect(
      screen.getByRole('listitem', { name: 'Player 2, 0 points, current player' })
    ).toBeTruthy();
    expect(
      screen
        .getByRole('button', { name: 'Play word, valid play required' })
        .hasAttribute('disabled')
    ).toBe(true);

    const savedGame: unknown = JSON.parse(localStorage.getItem(GAME_STORAGE_KEY) ?? 'null');
    expect(isGameState(savedGame)).toBe(true);
    if (!isGameState(savedGame)) {
      throw new Error('Expected the submitted game to be valid.');
    }
    expect(savedGame.pendingTileIds).toEqual([]);
    expect(savedGame.currentPlayerIndex).toBe(1);
  });

  it('requires a letter choice for a blank tile before validating the word', () => {
    localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify(gameWithRackLetters(['blank', 'T'])));
    render(<App />);

    const rack = within(screen.getByRole('region', { name: 'P1 rack' })).getByRole('list');
    let draggedTileId = '';
    const dataTransfer = {
      effectAllowed: 'none',
      getData: () => draggedTileId,
      setData: (_format: string, value: string) => {
        draggedTileId = value;
      },
      setDragImage: () => {},
    };
    const blankTile = within(rack).getByRole('listitem', { name: 'Blank tile, 0 points' });
    fireEvent.dragStart(blankTile, { dataTransfer });
    fireEvent.drop(screen.getByRole('cell', { name: 'Row 8, column 8, center start' }), {
      dataTransfer,
    });

    expect(screen.getByRole('dialog')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Use blank as A' }));
    expect(screen.getByRole('cell', { name: /Blank tile assigned as A/ }).textContent).toContain(
      'A'
    );

    const tTile = within(rack).getAllByRole('listitem', { name: 'T, 1 points' })[0];
    if (!tTile) {
      throw new Error('The test rack does not contain a T tile.');
    }

    fireEvent.dragStart(tTile, { dataTransfer });
    fireEvent.drop(screen.getByRole('cell', { name: 'Row 8, column 9' }), { dataTransfer });

    const playButton = screen.getByRole('button', {
      name: 'Play word for 2 points and end turn',
    });
    expect(playButton.hasAttribute('disabled')).toBe(false);
    expect(playButton.textContent).toBe('Play (+2)');
  });

  it('moves rack tiles onto empty board cells and keeps occupied cells unchanged', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Start game' }));

    const rack = within(screen.getByRole('region', { name: 'P1 rack' })).getByRole('list');
    const boardCell = screen.getByRole('cell', { name: 'Row 1, column 1, triple word' });
    let draggedTileId = '';
    const dataTransfer = {
      effectAllowed: 'none',
      getData: () => draggedTileId,
      setData: (_format: string, value: string) => {
        draggedTileId = value;
      },
      setDragImage: () => {},
    };

    fireEvent.dragStart(within(rack).getAllByRole('listitem')[0], { dataTransfer });
    fireEvent.drop(boardCell, { dataTransfer });

    expect(within(rack).getAllByRole('listitem')).toHaveLength(6);
    expect(boardCell.getAttribute('aria-label')).toContain('occupied');
    const placedTileLabel = boardCell.getAttribute('aria-label');
    const savedGame: unknown = JSON.parse(localStorage.getItem(GAME_STORAGE_KEY) ?? 'null');
    expect(isGameState(savedGame)).toBe(true);
    if (!isGameState(savedGame)) {
      throw new Error('Expected the saved game to be valid.');
    }

    expect(savedGame.placedTiles).toHaveLength(1);

    fireEvent.dragStart(within(rack).getAllByRole('listitem')[0], { dataTransfer });
    fireEvent.drop(boardCell, { dataTransfer });

    expect(within(rack).getAllByRole('listitem')).toHaveLength(6);
    expect(boardCell.getAttribute('aria-label')).toBe(placedTileLabel);
    const updatedGame: unknown = JSON.parse(localStorage.getItem(GAME_STORAGE_KEY) ?? 'null');
    expect(isGameState(updatedGame)).toBe(true);
    if (!isGameState(updatedGame)) {
      throw new Error('Expected the updated game to be valid.');
    }

    expect(updatedGame.placedTiles).toHaveLength(1);
  });

  it('moves a tile placed this turn and returns it to the rack', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Start game' }));

    const rack = within(screen.getByRole('region', { name: 'P1 rack' })).getByRole('list');
    let draggedTileId = '';
    const dataTransfer = {
      effectAllowed: 'none',
      getData: () => draggedTileId,
      setData: (_format: string, value: string) => {
        draggedTileId = value;
      },
      setDragImage: () => {},
    };
    const firstRackTile = within(rack).getAllByRole('listitem')[0];
    fireEvent.dragStart(firstRackTile, { dataTransfer });
    fireEvent.drop(screen.getByRole('cell', { name: 'Row 1, column 1, triple word' }), {
      dataTransfer,
    });

    const firstCell = screen.getByRole('cell', { name: /Row 1, column 1, .* occupied/ });
    const nextCell = screen.getByRole('cell', { name: 'Row 1, column 2' });
    fireEvent.dragStart(firstCell, { dataTransfer });
    fireEvent.drop(nextCell, { dataTransfer });

    expect(screen.getByRole('cell', { name: 'Row 1, column 1, triple word' })).toBeTruthy();
    const movedCell = screen.getByRole('cell', { name: /Row 1, column 2, .* occupied/ });
    expect(movedCell.getAttribute('draggable')).toBe('true');

    fireEvent.dragStart(movedCell, { dataTransfer });
    fireEvent.drop(rack, { dataTransfer });

    expect(within(rack).getAllByRole('listitem')).toHaveLength(7);
    expect(screen.getByRole('cell', { name: 'Row 1, column 2' })).toBeTruthy();
    const savedGame: unknown = JSON.parse(localStorage.getItem(GAME_STORAGE_KEY) ?? 'null');
    expect(isGameState(savedGame)).toBe(true);
    if (!isGameState(savedGame)) {
      throw new Error('Expected the saved game to be valid.');
    }

    expect(savedGame.pendingTileIds).toEqual([]);
    expect(savedGame.placedTiles).toEqual([]);
  });

  it('returns all current-turn tiles to the rack without moving fixed tiles', () => {
    const game = gameWithRackLetters(['A', 'T']);
    const fixedTileIndex = game.tileBag.findIndex(({ letter }) => letter === 'C');
    const fixedTile = game.tileBag[fixedTileIndex];
    if (!fixedTile) {
      throw new Error('The test game does not contain a fixed C tile.');
    }
    const initialRackTileIds = game.players[0].rack.map(({ id }) => id);
    const gameWithFixedTile: GameState = {
      ...game,
      tileBag: game.tileBag.filter(({ id }) => id !== fixedTile.id),
      placedTiles: [{ row: 7, column: 7, tile: fixedTile }],
    };
    localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify(gameWithFixedTile));
    render(<App />);

    const rack = within(screen.getByRole('region', { name: 'P1 rack' })).getByRole('list');
    let draggedTileId = '';
    const dataTransfer = {
      effectAllowed: 'none',
      getData: () => draggedTileId,
      setData: (_format: string, value: string) => {
        draggedTileId = value;
      },
      setDragImage: () => {},
    };
    const placeRackTile = (letter: string, column: number) => {
      const tile = within(rack).getAllByRole('listitem', {
        name: `${letter}, 1 points`,
      })[0];
      if (!tile) {
        throw new Error(`The test rack does not contain a ${letter} tile.`);
      }

      fireEvent.dragStart(tile, { dataTransfer });
      fireEvent.drop(screen.getByRole('cell', { name: `Row 8, column ${column}` }), {
        dataTransfer,
      });
    };

    const returnButton = screen.getByRole('button', { name: 'Return all placed tiles to rack' });
    expect(returnButton.hasAttribute('disabled')).toBe(true);

    placeRackTile('A', 9);
    placeRackTile('T', 10);

    expect(returnButton.hasAttribute('disabled')).toBe(false);
    expect(
      screen
        .getByRole('button', { name: 'Play word for 5 points and end turn' })
        .hasAttribute('disabled')
    ).toBe(false);
    fireEvent.click(returnButton);

    expect(within(rack).getAllByRole('listitem')).toHaveLength(7);
    expect(screen.getByRole('cell', { name: /^Row 8, column 8, C tile/ })).toBeTruthy();
    expect(screen.getByRole('cell', { name: 'Row 8, column 9' })).toBeTruthy();
    expect(screen.getByRole('cell', { name: 'Row 8, column 10' })).toBeTruthy();
    expect(returnButton.hasAttribute('disabled')).toBe(true);
    expect(
      screen
        .getByRole('button', { name: 'Play word, valid play required' })
        .hasAttribute('disabled')
    ).toBe(true);

    const savedGame: unknown = JSON.parse(localStorage.getItem(GAME_STORAGE_KEY) ?? 'null');
    expect(isGameState(savedGame)).toBe(true);
    if (!isGameState(savedGame)) {
      throw new Error('Expected the returned game to be valid.');
    }
    expect(savedGame.placedTiles).toEqual([{ row: 7, column: 7, tile: fixedTile }]);
    expect(savedGame.pendingTileIds).toEqual([]);
    expect(savedGame.players[0].rack.map(({ id }) => id).sort()).toEqual(initialRackTileIds.sort());
  });

  it('reorders rack tiles and persists their new order', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Start game' }));

    const savedGame: unknown = JSON.parse(localStorage.getItem(GAME_STORAGE_KEY) ?? 'null');
    expect(isGameState(savedGame)).toBe(true);
    if (!isGameState(savedGame)) {
      throw new Error('Expected the saved game to be valid.');
    }

    const player = savedGame.players[savedGame.currentPlayerIndex];
    const originalTileIds = player.rack.map(({ id }) => id);
    const rack = within(screen.getByRole('region', { name: 'P1 rack' })).getByRole('list');
    const [draggedTile, targetTile] = within(rack).getAllByRole('listitem');
    let draggedTileId = '';
    const dataTransfer = {
      effectAllowed: 'none',
      getData: () => draggedTileId,
      setData: (_format: string, value: string) => {
        draggedTileId = value;
      },
      setDragImage: () => {},
    };

    fireEvent.dragStart(draggedTile, { dataTransfer });
    const dropEvent = new MouseEvent('drop', { bubbles: true, cancelable: true, clientX: 1 });
    Object.defineProperty(dropEvent, 'dataTransfer', { value: dataTransfer });
    fireEvent(targetTile, dropEvent);
    fireEvent.dragEnd(draggedTile);

    const updatedGame: unknown = JSON.parse(localStorage.getItem(GAME_STORAGE_KEY) ?? 'null');
    expect(isGameState(updatedGame)).toBe(true);
    if (!isGameState(updatedGame)) {
      throw new Error('Expected the updated game to be valid.');
    }

    expect(updatedGame.players[updatedGame.currentPlayerIndex].rack.map(({ id }) => id)).toEqual([
      originalTileIds[1],
      originalTileIds[0],
      ...originalTileIds.slice(2),
    ]);
  });

  it('shows the start dialog over the board when no game is saved', () => {
    render(<App />);

    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByRole('table', { hidden: true, name: 'Scrabble game board' })).toBeTruthy();
    expect(screen.getAllByRole('radio')).toHaveLength(3);
  });

  it('saves a shuffled game, restores it, and starts with player one', () => {
    const { unmount } = render(<App />);

    fireEvent.click(screen.getByRole('radio', { name: '4 players' }));
    fireEvent.click(screen.getByRole('button', { name: 'Start game' }));

    const serializedGame = localStorage.getItem(GAME_STORAGE_KEY);
    expect(serializedGame).not.toBeNull();
    const savedGame: unknown = JSON.parse(serializedGame ?? 'null');
    expect(isGameState(savedGame)).toBe(true);
    if (!isGameState(savedGame)) {
      throw new Error('Expected the saved game to be valid.');
    }

    expect(savedGame.players).toHaveLength(4);
    expect(savedGame.players.map(({ rack }) => rack)).toHaveLength(4);
    expect(savedGame.players.every(({ rack }) => rack.length === 7)).toBe(true);
    expect(savedGame.tileBag).toHaveLength(72);
    expect(savedGame.currentPlayerIndex).toBe(0);
    expect(screen.getByRole('list', { name: 'Scores' }).children).toHaveLength(4);
    expect(screen.getByRole('heading', { name: 'P1 rack' })).toBeTruthy();
    expect(screen.getByRole('table', { name: 'Scrabble game board' })).toBeTruthy();

    unmount();
    render(<App />);

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('list', { name: 'Scores' }).children).toHaveLength(4);
    expect(screen.getByRole('heading', { name: 'P1 rack' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Quit game' }));

    expect(localStorage.getItem(GAME_STORAGE_KEY)).toBeNull();
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('deals tiles using the standard Scrabble distribution', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Start game' }));

    const savedGame: unknown = JSON.parse(localStorage.getItem(GAME_STORAGE_KEY) ?? 'null');
    expect(isGameState(savedGame)).toBe(true);
    if (!isGameState(savedGame)) {
      throw new Error('Expected the saved game to be valid.');
    }

    const allTiles = [...savedGame.players.flatMap(({ rack }) => rack), ...savedGame.tileBag];
    expect(allTiles).toHaveLength(100);

    const expectedCounts = Object.fromEntries(
      TILE_DISTRIBUTION.map(({ letter, count }) => [letter, count])
    );
    const actualCounts = Object.fromEntries(
      TILE_DISTRIBUTION.map(({ letter }) => [
        letter,
        allTiles.filter((tile) => tile.letter === letter).length,
      ])
    );
    expect(actualCounts).toEqual(expectedCounts);
  });

  it('restores games saved before board placements were added', () => {
    const { placedTiles, ...legacyGame } = createNewGame(2);
    expect(placedTiles).toEqual([]);
    localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify(legacyGame));

    render(<App />);

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('heading', { name: 'P1 rack' })).toBeTruthy();
  });
});
