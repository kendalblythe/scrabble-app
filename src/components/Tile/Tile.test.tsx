// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import Tile from './Tile';

afterEach(cleanup);

describe('Tile component', () => {
  it('renders a letter and its point value', () => {
    render(<Tile tile={{ id: 'A-0', letter: 'A', points: 1 }} variant="rack" />);

    expect(screen.getByText('A')).toBeTruthy();
    expect(screen.getByText('1')).toBeTruthy();
  });

  it('renders the point value for a blank tile without a letter', () => {
    const { container } = render(
      <Tile tile={{ id: 'blank-0', letter: 'blank', points: 0 }} variant="board" />
    );

    expect(container.textContent).toBe('0');
  });

  it('keeps rack and board letter styling consistent while giving board tiles a distinct face', () => {
    const tile = { id: 'A-0', letter: 'A' as const, points: 1 };
    const { container, rerender } = render(<Tile tile={tile} variant="rack" />);
    const rackFaceClass = container.querySelector('.game-rack-tile')?.className;
    const rackLetterClass = container.querySelector('.game-tile-letter')?.className;
    const rackPointsClass = container.querySelector('.game-tile-points')?.className;

    rerender(<Tile tile={tile} variant="board" />);

    expect(rackFaceClass).toContain('bg-[#f1d289]');
    expect(container.querySelector('.game-board-tile')?.className).toContain('bg-[#f1d289]');
    expect(container.querySelector('.game-tile-letter')?.className).toBe(rackLetterClass);
    expect(container.querySelector('.game-tile-points')?.className).toBe(rackPointsClass);
  });
});
