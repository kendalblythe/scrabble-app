export type Bonus = 'triple-word' | 'double-word' | 'triple-letter' | 'double-letter' | 'center';

export type BoardSquare = {
  row: number;
  column: number;
  bonus?: Bonus;
};

const tripleWord = [
  [0, 0],
  [0, 7],
  [0, 14],
  [7, 0],
  [7, 14],
  [14, 0],
  [14, 7],
  [14, 14],
];

const doubleWord = [
  [1, 1],
  [2, 2],
  [3, 3],
  [4, 4],
  [7, 7],
  [10, 10],
  [11, 11],
  [12, 12],
  [13, 13],
  [1, 13],
  [2, 12],
  [3, 11],
  [4, 10],
  [10, 4],
  [11, 3],
  [12, 2],
  [13, 1],
];

const tripleLetter = [
  [1, 5],
  [1, 9],
  [5, 1],
  [5, 5],
  [5, 9],
  [5, 13],
  [9, 1],
  [9, 5],
  [9, 9],
  [9, 13],
  [13, 5],
  [13, 9],
];

const doubleLetter = [
  [0, 3],
  [0, 11],
  [2, 6],
  [2, 8],
  [3, 0],
  [3, 7],
  [3, 14],
  [6, 2],
  [6, 6],
  [6, 8],
  [6, 12],
  [7, 3],
  [7, 11],
  [8, 2],
  [8, 6],
  [8, 8],
  [8, 12],
  [11, 0],
  [11, 7],
  [11, 14],
  [12, 6],
  [12, 8],
  [14, 3],
  [14, 11],
];

const coordinates = (points: number[][]) =>
  new Set(points.map(([row, column]) => `${row}-${column}`));

const premiumSquares: [Bonus, Set<string>][] = [
  ['triple-word', coordinates(tripleWord)],
  ['double-word', coordinates(doubleWord)],
  ['triple-letter', coordinates(tripleLetter)],
  ['double-letter', coordinates(doubleLetter)],
];

export const BOARD_SIZE = 15;

export const BOARD_SQUARES: BoardSquare[] = Array.from(
  { length: BOARD_SIZE * BOARD_SIZE },
  (_, index) => {
    const row = Math.floor(index / BOARD_SIZE);
    const column = index % BOARD_SIZE;
    const key = `${row}-${column}`;
    const bonus =
      row === 7 && column === 7
        ? 'center'
        : premiumSquares.find(([, squares]) => squares.has(key))?.[0];

    return { row, column, bonus };
  }
);

export const BONUS_LABELS: Record<Bonus, string> = {
  'triple-word': 'TW',
  'double-word': 'DW',
  'triple-letter': 'TL',
  'double-letter': 'DL',
  center: '★',
};
