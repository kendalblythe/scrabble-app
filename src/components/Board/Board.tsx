import type { Bonus } from './board';
import { BOARD_SIZE, BOARD_SQUARES, BONUS_LABELS } from './board';

const bonusClasses: Record<Bonus, string> = {
  'triple-word': 'bg-[#c97768] text-[#fff9ec]',
  'double-word': 'bg-[#e8ad9c] text-[#7a453d]',
  'triple-letter': 'bg-[#6592a0] text-[#fff9ec]',
  'double-letter': 'bg-[#a4c4c0] text-[#315c5c]',
  center: 'bg-[#e8ad9c] text-[#7a453d]',
};

const squareLayoutClasses =
  'grid size-[calc((100cqw_-_14px)/15)] min-h-0 min-w-0 place-self-center place-items-center font-bold tracking-[0.02em]';

function Board() {
  return (
    <div className="aspect-square w-[min(calc(100vw_-_24px),calc(100dvh_-_24px))] border border-[#252525] bg-[#252525] p-0.5 shadow-[0_20px_46px_rgba(47,70,56,0.13),0_3px_8px_rgba(47,70,56,0.09)]">
      <table
        className="grid size-full grid-cols-[repeat(15,minmax(0,1fr))] grid-rows-[repeat(15,minmax(0,1fr))] gap-px bg-[#252525] [container-type:inline-size]"
        aria-label="Scrabble game board"
      >
        <tbody className="contents">
          {BOARD_SQUARES.filter(({ column }) => column === 0).map(({ row }) => (
            <tr className="contents" key={row}>
              {BOARD_SQUARES.slice(row * BOARD_SIZE, (row + 1) * BOARD_SIZE).map(
                ({ row, column, bonus }) => (
                  <td
                    className={`${squareLayoutClasses} ${
                      bonus ? bonusClasses[bonus] : 'bg-[#e9e3ce] text-[#fff9ec]'
                    } ${
                      bonus === 'center'
                        ? 'text-[clamp(10px,2vw,16px)]'
                        : 'text-[clamp(6px,1.35vw,10px)]'
                    }`}
                    key={`${row}-${column}`}
                    aria-label={`Row ${row + 1}, column ${column + 1}${
                      bonus
                        ? `, ${bonus.replace('-', ' ')}${bonus === 'center' ? ' start' : ''}`
                        : ''
                    }`}
                  >
                    {bonus && <span>{BONUS_LABELS[bonus]}</span>}
                  </td>
                )
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Board;
