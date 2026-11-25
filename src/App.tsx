import { BOARD_SIZE, BOARD_SQUARES, BONUS_LABELS } from './board';

function App() {
  return (
    <main className="game-shell">
      <div className="board-frame">
        <table className="board" aria-label="Scrabble game board">
          <tbody>
            {BOARD_SQUARES.filter(({ column }) => column === 0).map(({ row }) => (
              <tr key={row}>
                {BOARD_SQUARES.slice(row * BOARD_SIZE, (row + 1) * BOARD_SIZE).map(
                  ({ row, column, bonus }) => (
                    <td
                      className={`square${bonus ? ` square--${bonus}` : ''}`}
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
    </main>
  );
}

export default App;
