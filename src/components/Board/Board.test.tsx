// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import Board from './Board';

afterEach(cleanup);

describe('Board component', () => {
  it('renders a 15-by-15 accessible grid', () => {
    render(<Board />);

    const board = screen.getByRole('table', { name: 'Scrabble game board' });

    expect(within(board).getAllByRole('row')).toHaveLength(15);
    expect(within(board).getAllByRole('cell')).toHaveLength(225);
  });

  it('renders premium square labels and the center star', () => {
    render(<Board />);

    const premiumSquares: [string, string][] = [
      ['Row 1, column 1, triple word', 'TW'],
      ['Row 2, column 2, double word', 'DW'],
      ['Row 2, column 6, triple letter', 'TL'],
      ['Row 1, column 4, double letter', 'DL'],
      ['Row 8, column 8, center start', '★'],
    ];

    for (const [name, label] of premiumSquares) {
      expect(screen.getByRole('cell', { name }).textContent).toBe(label);
    }
  });
});
