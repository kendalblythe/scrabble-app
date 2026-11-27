// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Board from './Board';

afterEach(() => {
  cleanup();
  Reflect.deleteProperty(document, 'elementFromPoint');
});

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

  it('accepts a tile drop on an empty square', () => {
    const onTileDrop = vi.fn();
    render(<Board onTileDrop={onTileDrop} />);

    fireEvent.drop(screen.getByRole('cell', { name: 'Row 1, column 1, triple word' }), {
      dataTransfer: { getData: () => 'A-0' },
    });

    expect(onTileDrop).toHaveBeenCalledWith('A-0', 0, 0);
  });

  it('does not accept a tile drop on an occupied square', () => {
    const onTileDrop = vi.fn();
    render(
      <Board
        onTileDrop={onTileDrop}
        placedTiles={[{ row: 0, column: 0, tile: { id: 'A-0', letter: 'A', points: 1 } }]}
      />
    );

    fireEvent.drop(
      screen.getByRole('cell', {
        name: 'Row 1, column 1, A tile, 1 point, occupied',
      }),
      { dataTransfer: { getData: () => 'B-0' } }
    );

    expect(onTileDrop).not.toHaveBeenCalled();
  });

  it('only makes current-turn tiles draggable', () => {
    const tile = { id: 'A-0', letter: 'A' as const, points: 1 };
    const lockedTile = { id: 'B-0', letter: 'B' as const, points: 3 };
    const { container } = render(
      <Board
        placedTiles={[
          { row: 1, column: 1, tile },
          { row: 0, column: 0, tile: lockedTile },
        ]}
        pendingTileIds={[tile.id]}
      />
    );

    const pendingCell = screen.getByRole('cell', {
      name: 'Row 2, column 2, A tile, 1 point, occupied',
    });
    const lockedCell = screen.getByRole('cell', {
      name: 'Row 1, column 1, B tile, 3 points, occupied',
    });
    let draggedTileId = '';
    const dataTransfer = {
      effectAllowed: 'none',
      setData: (_format: string, value: string) => {
        draggedTileId = value;
      },
      setDragImage: vi.fn(),
    };

    expect(pendingCell.getAttribute('draggable')).toBe('true');
    expect(lockedCell.getAttribute('draggable')).toBe('false');
    fireEvent.dragStart(pendingCell, { dataTransfer });
    expect(draggedTileId).toBe(tile.id);
    expect(dataTransfer.setDragImage).toHaveBeenCalledOnce();
    expect(pendingCell.querySelector('.game-tile-face')).toBeNull();
    expect(pendingCell.textContent).toBe('DW');
    expect(pendingCell.className).toContain('bg-[#e8ad9c]');
    expect(container.querySelector('[data-board-drag-preview]')).not.toBeNull();

    fireEvent.dragEnd(pendingCell);

    expect(pendingCell.querySelector('.game-tile-face')).not.toBeNull();
    expect(pendingCell.textContent).toContain('A');
    expect(container.querySelector('[data-board-drag-preview]')).toBeNull();
  });

  it('returns a pending board tile to the rack with a touch pointer', () => {
    const onRackDrop = vi.fn();
    const tile = { id: 'A-0', letter: 'A' as const, points: 1 };
    const { container } = render(
      <Board
        placedTiles={[{ row: 1, column: 1, tile }]}
        pendingTileIds={[tile.id]}
        onRackDrop={onRackDrop}
      />
    );
    const sourceCell = screen.getByRole('cell', {
      name: 'Row 2, column 2, A tile, 1 point, occupied',
    });
    const rackTile = document.createElement('li');
    rackTile.dataset.rackTile = 'true';
    rackTile.dataset.rackTileId = 'B-0';
    vi.spyOn(rackTile, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 20, 20));
    Object.defineProperty(document, 'elementFromPoint', {
      configurable: true,
      value: () => rackTile,
    });

    fireEvent.pointerDown(sourceCell, {
      pointerId: 2,
      pointerType: 'touch',
      isPrimary: true,
      clientX: 10,
      clientY: 10,
    });
    fireEvent.pointerMove(window, {
      pointerId: 2,
      pointerType: 'touch',
      clientX: 18,
      clientY: 10,
    });

    expect(sourceCell.querySelector('.game-tile-face')).toBeNull();
    expect(container.querySelector('[data-board-drag-preview]')).not.toBeNull();

    fireEvent.pointerUp(window, {
      pointerId: 2,
      pointerType: 'touch',
      clientX: 18,
      clientY: 10,
    });

    expect(sourceCell.style.touchAction).toBe('none');
    expect(onRackDrop).toHaveBeenCalledWith('A-0', 'B-0', true);
    expect(container.querySelector('[data-board-drag-preview]')).toBeNull();
  });
});
