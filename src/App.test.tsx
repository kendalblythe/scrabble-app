// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import App from './App';
import { createNewGame, GAME_STORAGE_KEY, isGameState, TILE_DISTRIBUTION } from './game';

afterEach(cleanup);
beforeEach(() => localStorage.clear());

describe('App', () => {
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
