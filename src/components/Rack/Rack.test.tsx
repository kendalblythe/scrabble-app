// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Rack from './Rack';

afterEach(cleanup);

describe('Rack component', () => {
  it('reserves space for seven tiles when the rack is partially filled', () => {
    render(
      <Rack playerId={1} tiles={[{ id: 'A-0', letter: 'A', points: 1 }]} onRackDrop={vi.fn()} />
    );

    expect(screen.getByRole('list').style.gridTemplateColumns).toBe(
      'repeat(7, var(--game-cell-size))'
    );
  });

  it('renders the player rack and makes its tiles draggable', () => {
    let draggedTileId = '';
    let dragImageSize = 0;
    const dataTransfer = {
      effectAllowed: 'none',
      setData: (_format: string, value: string) => {
        draggedTileId = value;
      },
      setDragImage: (element: HTMLCanvasElement) => {
        dragImageSize = element.width;
      },
    };

    const { container } = render(
      <Rack playerId={2} tiles={[{ id: 'A-0', letter: 'A', points: 1 }]} onRackDrop={vi.fn()} />
    );

    const tile = screen.getByRole('listitem', { name: 'A, 1 points' });
    expect(screen.getByRole('heading', { name: 'P2 rack' })).toBeTruthy();
    expect(tile.getAttribute('draggable')).toBe('true');

    fireEvent.dragStart(tile, { dataTransfer });

    expect(draggedTileId).toBe('A-0');
    expect(tile.style.opacity).toBe('0');
    expect(dataTransfer.effectAllowed).toBe('move');
    expect(dragImageSize).toBe(1);
    const preview = container.querySelector<HTMLElement>('[data-drag-preview]');
    expect(preview).not.toBeNull();
    expect(preview?.className).toContain('bg-[#e9e3ce]');
    expect(preview?.style.width).toBe('var(--game-cell-size)');

    fireEvent.dragEnd(tile);
    expect(container.querySelector('[data-drag-preview]')).toBeNull();
    expect(tile.style.opacity).toBe('');
  });

  it('reorders a dragged tile before or after the tile it is dropped on', () => {
    const onRackDrop = vi.fn();
    render(
      <Rack
        playerId={1}
        tiles={[
          { id: 'A-0', letter: 'A', points: 1 },
          { id: 'B-0', letter: 'B', points: 3 },
        ]}
        onRackDrop={onRackDrop}
      />
    );

    const targetTile = screen.getByRole('listitem', { name: 'B, 3 points' });
    vi.spyOn(targetTile, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 20, 20));
    const dropAt = (clientX: number) => {
      const event = new MouseEvent('drop', { bubbles: true, cancelable: true, clientX });
      Object.defineProperty(event, 'dataTransfer', { value: { getData: () => 'A-0' } });
      fireEvent(targetTile, event);
    };

    dropAt(15);
    dropAt(5);

    expect(onRackDrop.mock.calls).toEqual([
      ['A-0', 'B-0', true],
      ['A-0', 'B-0', false],
    ]);
  });

  it('appends a dragged tile when dropped in the empty rack area', () => {
    const onRackDrop = vi.fn();
    render(
      <Rack
        playerId={1}
        tiles={[
          { id: 'A-0', letter: 'A', points: 1 },
          { id: 'B-0', letter: 'B', points: 3 },
        ]}
        onRackDrop={onRackDrop}
      />
    );

    fireEvent.drop(screen.getByRole('list'), {
      dataTransfer: { getData: () => 'A-0' },
    });

    expect(onRackDrop).toHaveBeenCalledWith('A-0', null, false);
  });
});
