import { describe, expect, it } from 'vitest';
import { BOARD_SIZE, BOARD_SQUARES } from './board';

describe('Scrabble board', () => {
  it('contains 225 squares in a 15 by 15 grid', () => {
    expect(BOARD_SIZE).toBe(15);
    expect(BOARD_SQUARES).toHaveLength(225);
    expect(BOARD_SQUARES.at(-1)).toMatchObject({ row: 14, column: 14 });
  });

  it('places the starting square in the center', () => {
    expect(BOARD_SQUARES.find(({ bonus }) => bonus === 'center')).toMatchObject({
      row: 7,
      column: 7,
    });
  });

  it('places triple-word squares in all four corners', () => {
    const corners = BOARD_SQUARES.filter(({ bonus }) => bonus === 'triple-word');

    expect(corners).toHaveLength(8);
    expect(corners.map(({ row, column }) => `${row}-${column}`)).toEqual(
      expect.arrayContaining(['0-0', '0-14', '14-0', '14-14'])
    );
  });
});
