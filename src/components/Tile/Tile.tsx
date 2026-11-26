import type { Tile as TileData } from '../../game';

type TileProps = {
  tile: TileData;
  variant: 'rack' | 'board';
  displayLetter?: string;
};

function Tile({ tile, variant, displayLetter }: TileProps) {
  const isRackTile = variant === 'rack';
  const sizeClass = isRackTile
    ? 'game-rack-tile rounded-md'
    : 'game-board-tile size-full rounded-sm';
  const letter = displayLetter ?? (tile.letter === 'blank' ? '' : tile.letter);

  return (
    <span
      aria-hidden="true"
      className={`game-tile-face relative grid place-items-center border border-[#a68137] bg-[#f1d289] font-bold text-[#3d3024] shadow-sm ${sizeClass}`}
    >
      <span className="game-tile-letter">{letter}</span>
      <span className="game-tile-points absolute bottom-0 right-1 leading-none">{tile.points}</span>
    </span>
  );
}

export default Tile;
