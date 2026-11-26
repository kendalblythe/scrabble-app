import { useEffect, useState } from 'react';
import { RACK_SIZE, type Tile as TileData } from '../../game';
import Tile from '../Tile/Tile';

type RackProps = {
  playerId: number;
  tiles: TileData[];
  onRackDrop: (tileId: string, targetTileId: string | null, insertAfter: boolean) => void;
};

function Rack({ playerId, tiles, onRackDrop }: RackProps) {
  const [draggedTile, setDraggedTile] = useState<{
    tile: TileData;
    x: number;
    y: number;
  } | null>(null);

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
        className="game-rack-panel flex items-center justify-center gap-2"
      >
        <h2 className="text-base font-semibold text-[#765050]">P{playerId} rack</h2>
        <ul
          className="grid gap-1 rounded-lg bg-[#765050] p-2"
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
              key={tile.id}
              style={{ opacity: draggedTile?.tile.id === tile.id ? 0 : undefined }}
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
      </section>
      {draggedTile && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed z-50 grid place-items-center bg-[#e9e3ce]"
          data-drag-preview
          style={{
            left: draggedTile.x,
            top: draggedTile.y,
            width: 'var(--game-cell-size)',
            height: 'var(--game-cell-size)',
            transform: 'translate(-50%, -50%)',
          }}
        >
          <Tile tile={draggedTile.tile} variant="rack" />
        </div>
      )}
    </>
  );
}

export default Rack;
