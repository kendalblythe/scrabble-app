// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import App from './App';
import { GAME_STORAGE_KEY, isGameState, TILE_DISTRIBUTION } from './game';

afterEach(cleanup);
beforeEach(() => localStorage.clear());

describe('App', () => {
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
    expect(screen.getByRole('heading', { name: "Player 1's rack" })).toBeTruthy();
    expect(screen.getByRole('table', { name: 'Scrabble game board' })).toBeTruthy();

    unmount();
    render(<App />);

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('list', { name: 'Scores' }).children).toHaveLength(4);
    expect(screen.getByRole('heading', { name: "Player 1's rack" })).toBeTruthy();

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
});
