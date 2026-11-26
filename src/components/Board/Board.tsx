import { useEffect, useState } from 'react';
import type { PlacedTile } from '../../game';
import Tile from '../Tile/Tile';
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
  'grid size-full min-h-0 min-w-0 place-items-center font-bold tracking-[0.02em]';

type BoardProps = {
  fitPlayerPanels?: boolean;
  placedTiles?: PlacedTile[];
  pendingTileIds?: string[];
  onTileDrop?: (tileId: string, row: number, column: number) => void;
};

function Board({
  fitPlayerPanels = false,
  placedTiles = [],
  pendingTileIds = [],
  onTileDrop,
}: BoardProps) {
  const [draggedTile, setDraggedTile] = useState<{
    placement: PlacedTile;
    x: number;
    y: number;
  } | null>(null);
  const sizeClass = fitPlayerPanels
    ? 'w-[var(--game-board-size)] max-h-full max-w-full'
    : 'w-[var(--game-board-size)]';
  const placementsBySquare = new Map(
    placedTiles.map((placement) => [`${placement.row}-${placement.column}`, placement])
  );
  const pendingTileIdsSet = new Set(pendingTileIds);

  useEffect(() => {
    const clearDraggedTile = () => setDraggedTile(null);
    window.addEventListener('drop', clearDraggedTile);
    window.addEventListener('dragend', clearDraggedTile);

    return () => {
      window.removeEventListener('drop', clearDraggedTile);
      window.removeEventListener('dragend', clearDraggedTile);
    };
  }, []);

  return (
    <div
      className={`aspect-square ${sizeClass} border border-[#765050] bg-[#252525] p-0.5 shadow-[0_20px_46px_rgba(47,47,47,0.13),0_3px_8px_rgba(47,47,47,0.09)]`}
    >
      <table className="block size-full" aria-label="Scrabble game board">
        <tbody className="grid size-full grid-rows-[repeat(15,minmax(0,1fr))] gap-px bg-[#252525]">
          {BOARD_SQUARES.filter(({ column }) => column === 0).map(({ row }) => (
            <tr className="grid min-h-0 grid-cols-[repeat(15,minmax(0,1fr))] gap-px" key={row}>
              {BOARD_SQUARES.slice(row * BOARD_SIZE, (row + 1) * BOARD_SIZE).map(
                ({ row, column, bonus }) => {
                  const placement = placementsBySquare.get(`${row}-${column}`);
                  const tile = placement?.tile;
                  const isDraggedTile =
                    placement !== undefined && draggedTile?.placement.tile.id === placement.tile.id;
                  const showTile = placement !== undefined && !isDraggedTile;
                  const showBonus = !showTile && bonus !== undefined;
                  const squareClasses = showTile
                    ? 'bg-[#e9e3ce] text-[#3d3024]'
                    : bonus
                      ? bonusClasses[bonus]
                      : 'bg-[#e9e3ce] text-[#fff9ec]';
                  const bonusTextSizeClass =
                    showBonus && bonus === 'center'
                      ? 'text-[clamp(10px,_calc(var(--game-cell-size)_*_0.7),_16px)]'
                      : showBonus
                        ? 'text-[clamp(6px,_calc(var(--game-cell-size)_*_0.45),_10px)]'
                        : '';
                  const canDrop = onTileDrop !== undefined && tile === undefined;
                  const canMoveTile =
                    placement !== undefined && pendingTileIdsSet.has(placement.tile.id);
                  const tileName =
                    tile?.letter === 'blank'
                      ? placement?.assignedLetter
                        ? `Blank tile assigned as ${placement.assignedLetter}`
                        : 'Blank tile'
                      : tile
                        ? `${tile.letter} tile`
                        : '';
                  const tilePoints = tile
                    ? `${tile.points} point${tile.points === 1 ? '' : 's'}`
                    : '';

                  return (
                    <td
                      className={`${squareLayoutClasses} ${squareClasses} ${bonusTextSizeClass}`}
                      key={`${row}-${column}`}
                      draggable={canMoveTile}
                      aria-label={`Row ${row + 1}, column ${column + 1}${
                        bonus && !tile
                          ? `, ${bonus.replace('-', ' ')}${bonus === 'center' ? ' start' : ''}`
                          : ''
                      }${tile ? `, ${tileName}, ${tilePoints}, occupied` : ''}`}
                      onDragStart={(event) => {
                        if (!canMoveTile || !placement) {
                          return;
                        }

                        event.dataTransfer.setData('text/plain', placement.tile.id);
                        event.dataTransfer.effectAllowed = 'move';
                        const transparentImage = document.createElement('canvas');
                        transparentImage.width = 1;
                        transparentImage.height = 1;
                        event.dataTransfer.setDragImage(transparentImage, 0, 0);
                        setDraggedTile({ placement, x: event.clientX, y: event.clientY });
                      }}
                      onDrag={(event) => {
                        if (canMoveTile && placement) {
                          setDraggedTile({ placement, x: event.clientX, y: event.clientY });
                        }
                      }}
                      onDragEnd={() => setDraggedTile(null)}
                      onDragOver={(event) => {
                        if (canDrop) {
                          event.preventDefault();
                        }
                      }}
                      onDrop={(event) => {
                        if (!canDrop || !onTileDrop) {
                          return;
                        }

                        event.preventDefault();
                        const tileId = event.dataTransfer.getData('text/plain');
                        if (tileId) {
                          onTileDrop(tileId, row, column);
                        }
                      }}
                    >
                      {showTile && placement ? (
                        <Tile
                          tile={placement.tile}
                          variant="board"
                          displayLetter={placement.assignedLetter}
                        />
                      ) : (
                        showBonus && <span>{BONUS_LABELS[bonus]}</span>
                      )}
                    </td>
                  );
                }
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {draggedTile && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed z-50 grid place-items-center"
          data-board-drag-preview
          style={{
            left: draggedTile.x,
            top: draggedTile.y,
            width: 'var(--game-cell-size)',
            height: 'var(--game-cell-size)',
            transform: 'translate(-50%, -50%)',
          }}
        >
          <Tile
            tile={draggedTile.placement.tile}
            variant="board"
            displayLetter={draggedTile.placement.assignedLetter}
          />
        </div>
      )}
    </div>
  );
}

export default Board;
