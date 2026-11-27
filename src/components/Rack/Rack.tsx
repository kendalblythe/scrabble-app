import { useEffect, useState } from 'react';
import { Button } from 'react-aria-components';
import { RACK_SIZE, type Tile as TileData } from '../../game';
import usePointerTileDrag from '../../hooks/usePointerTileDrag';
import Tile from '../Tile/Tile';

type RackProps = {
  playerId: number;
  tiles: TileData[];
  onRackDrop: (tileId: string, targetTileId: string | null, insertAfter: boolean) => void;
  onTileDrop?: (tileId: string, row: number, column: number) => void;
  turnScore?: number | null;
  onSubmitTurn?: () => void;
  hasPendingTiles?: boolean;
  onReturnTiles?: () => void;
};

function Rack({
  playerId,
  tiles,
  onRackDrop,
  onTileDrop,
  turnScore,
  onSubmitTurn,
  hasPendingTiles,
  onReturnTiles,
}: RackProps) {
  const [draggedTile, setDraggedTile] = useState<{
    tile: TileData;
    x: number;
    y: number;
  } | null>(null);
  const scorePreview = turnScore ?? null;
  const hasValidPlay = scorePreview !== null;
  const pointerDrag = usePointerTileDrag((tileId, target, x) => {
    const boardCell = target.closest<HTMLElement>('[data-board-cell]');
    if (boardCell && onTileDrop) {
      onTileDrop(tileId, Number(boardCell.dataset.row), Number(boardCell.dataset.column));
      return;
    }

    const targetTile = target.closest<HTMLElement>('[data-rack-tile]');
    if (targetTile) {
      if (targetTile.dataset.rackTileId !== tileId) {
        const { left, width } = targetTile.getBoundingClientRect();
        onRackDrop(tileId, targetTile.dataset.rackTileId ?? null, x > left + width / 2);
      }

      return;
    }

    if (target.closest('[data-rack-list]')) {
      onRackDrop(tileId, null, false);
    }
  });
  const pointerDraggedTile = pointerDrag.drag?.isDragging
    ? tiles.find(({ id }) => id === pointerDrag.drag?.tileId)
    : undefined;
  const previewTile = pointerDraggedTile ?? draggedTile?.tile;

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
    <>
      <section
        aria-label={`P${playerId} rack`}
        className="game-rack-panel flex flex-wrap items-center gap-2 max-sm:grid max-sm:grid-cols-[max-content_max-content] max-sm:justify-start sm:justify-center"
      >
        <h2 className="text-base font-semibold text-[#765050]">P{playerId} rack</h2>
        <ul
          className="grid gap-1 rounded-lg bg-[#765050] p-2"
          data-rack-list
          style={{ gridTemplateColumns: `repeat(${RACK_SIZE}, var(--game-cell-size))` }}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            const draggedTileId = event.dataTransfer.getData('text/plain');
            if (draggedTileId) {
              onRackDrop(draggedTileId, null, false);
            }
          }}
        >
          {tiles.map((tile) => (
            <li
              aria-label={`${tile.letter === 'blank' ? 'Blank tile' : tile.letter}, ${tile.points} points`}
              draggable
              data-rack-tile
              data-rack-tile-id={tile.id}
              key={tile.id}
              style={{
                opacity:
                  draggedTile?.tile.id === tile.id || pointerDraggedTile?.id === tile.id
                    ? 0
                    : undefined,
                touchAction: 'none',
              }}
              onPointerDown={(event) => pointerDrag.startDrag(tile.id, event)}
              onDrag={(event) => {
                setDraggedTile({ tile, x: event.clientX, y: event.clientY });
              }}
              onDragOver={(event) => event.preventDefault()}
              onDragEnd={() => setDraggedTile(null)}
              onDrop={(event) => {
                event.preventDefault();
                event.stopPropagation();
                const draggedTileId = event.dataTransfer.getData('text/plain');
                if (!draggedTileId || draggedTileId === tile.id) {
                  return;
                }

                const { left, width } = event.currentTarget.getBoundingClientRect();
                const insertAfter = event.clientX > left + width / 2;
                onRackDrop(draggedTileId, tile.id, insertAfter);
              }}
              onDragStart={(event) => {
                event.dataTransfer.setData('text/plain', tile.id);
                event.dataTransfer.effectAllowed = 'move';
                const transparentImage = document.createElement('canvas');
                transparentImage.width = 1;
                transparentImage.height = 1;
                event.dataTransfer.setDragImage(transparentImage, 0, 0);
                setDraggedTile({ tile, x: event.clientX, y: event.clientY });
              }}
            >
              <Tile tile={tile} variant="rack" />
            </li>
          ))}
        </ul>
        {(onSubmitTurn || onReturnTiles) && (
          <div className="flex items-center gap-2 max-sm:col-start-2">
            {onSubmitTurn && (
              <Button
                aria-label={
                  hasValidPlay
                    ? `Play word for ${scorePreview} points and end turn`
                    : 'Play word, valid play required'
                }
                className="shrink-0 rounded-lg bg-green-700 px-2 py-2 text-sm font-semibold text-white outline-none transition hover:bg-green-800 focus-visible:ring-2 focus-visible:ring-green-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:border disabled:border-[#765050] disabled:bg-transparent disabled:text-[#765050] disabled:opacity-50 disabled:hover:bg-transparent"
                isDisabled={!hasValidPlay}
                onPress={onSubmitTurn}
              >
                {hasValidPlay ? `Play (+${scorePreview})` : 'Play'}
              </Button>
            )}
            {onReturnTiles && (
              <Button
                aria-label="Return all placed tiles to rack"
                className="shrink-0 rounded-lg border border-[#765050] px-2 py-2 text-sm font-semibold text-[#765050] outline-none transition hover:bg-[#f2eaea] focus-visible:ring-2 focus-visible:ring-[#765050] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
                isDisabled={!hasPendingTiles}
                onPress={onReturnTiles}
              >
                Return tiles
              </Button>
            )}
          </div>
        )}
      </section>
      {previewTile && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed z-50 grid place-items-center bg-[#e9e3ce]"
          data-drag-preview
          style={{
            left: pointerDraggedTile ? pointerDrag.drag?.x : draggedTile?.x,
            top: pointerDraggedTile ? pointerDrag.drag?.y : draggedTile?.y,
            width: 'var(--game-cell-size)',
            height: 'var(--game-cell-size)',
            transform: 'translate(-50%, -50%)',
          }}
        >
          <Tile tile={previewTile} variant="rack" />
        </div>
      )}
    </>
  );
}

export default Rack;
