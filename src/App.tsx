import { useEffect, useState } from 'react';
import {
  Button,
  Dialog,
  Heading,
  Modal,
  ModalOverlay,
  Radio,
  RadioGroup,
} from 'react-aria-components';
import Board from './components/Board/Board';
import Rack from './components/Rack/Rack';
import {
  assignBlankTile,
  BOARD_LETTERS,
  createNewGame,
  GAME_STORAGE_KEY,
  type BoardLetter,
  type GameState,
  isPlayerCount,
  movePendingTileOnBoard,
  normalizeGameState,
  PLAYER_COUNTS,
  type PlayerCount,
  placeTileOnBoard,
  reorderRackTile,
  returnAllPendingTilesToRack,
  returnPendingTileToRack,
} from './game';
import { evaluatePendingTurn, submitTurn } from './scrabbleRules';

function readCurrentGame(): GameState | null {
  const serializedGame = localStorage.getItem(GAME_STORAGE_KEY);
  if (!serializedGame) {
    return null;
  }

  try {
    const parsedGame: unknown = JSON.parse(serializedGame);
    const game = normalizeGameState(parsedGame);
    if (game) {
      return game;
    }
  } catch (error) {
    if (!(error instanceof SyntaxError)) {
      throw error;
    }
  }

  localStorage.removeItem(GAME_STORAGE_KEY);
  return null;
}

function App() {
  const [game, setGame] = useState<GameState | null>(readCurrentGame);
  const [unassignedBlankTileId, setUnassignedBlankTileId] = useState<string | null>(null);
  const [playerCount, setPlayerCount] = useState<PlayerCount>(2);
  const turnResult = game ? evaluatePendingTurn(game) : null;

  useEffect(() => {
    const unassignedBlank = game?.placedTiles.find(
      ({ tile, assignedLetter }) =>
        tile.letter === 'blank' &&
        assignedLetter === undefined &&
        game.pendingTileIds.includes(tile.id)
    );
    setUnassignedBlankTileId(unassignedBlank?.tile.id ?? null);
  }, [game]);

  const startGame = () => {
    const currentGame = createNewGame(playerCount);
    localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify(currentGame));
    setGame(currentGame);
  };

  const handleTileDrop = (tileId: string, row: number, column: number) => {
    if (!game) {
      return;
    }

    const nextGame = game.pendingTileIds.includes(tileId)
      ? movePendingTileOnBoard(game, tileId, row, column)
      : placeTileOnBoard(game, tileId, row, column);
    if (!nextGame) {
      return;
    }

    localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify(nextGame));
    setGame(nextGame);
  };

  const handleRackDrop = (tileId: string, targetTileId: string | null, insertAfter: boolean) => {
    if (!game) {
      return;
    }

    const nextGame =
      reorderRackTile(game, tileId, targetTileId, insertAfter) ??
      returnPendingTileToRack(game, tileId, targetTileId, insertAfter);
    if (!nextGame) {
      return;
    }

    localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify(nextGame));
    setGame(nextGame);
  };

  const handleBlankAssignment = (letter: BoardLetter) => {
    if (!game || !unassignedBlankTileId) {
      return;
    }

    const nextGame = assignBlankTile(game, unassignedBlankTileId, letter);
    if (!nextGame) {
      return;
    }

    localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify(nextGame));
    setGame(nextGame);
  };

  const handleSubmitTurn = () => {
    if (!game) {
      return;
    }

    const nextGame = submitTurn(game);
    if (!nextGame) {
      return;
    }

    localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify(nextGame));
    setGame(nextGame);
  };

  const handleReturnAllTiles = () => {
    if (!game) {
      return;
    }

    const nextGame = returnAllPendingTilesToRack(game);
    if (!nextGame) {
      return;
    }

    localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify(nextGame));
    setGame(nextGame);
  };

  const quitGame = () => {
    if (game && isPlayerCount(game.players.length)) {
      setPlayerCount(game.players.length);
    }

    localStorage.removeItem(GAME_STORAGE_KEY);
    setGame(null);
  };

  return (
    <main
      className={
        game
          ? 'game-layout grid min-h-dvh content-center grid-rows-[auto_auto_auto] gap-2 p-3 max-sm:content-start'
          : 'grid min-h-screen place-items-center p-3'
      }
    >
      {game ? (
        <>
          <header className="game-header grid w-full max-w-[var(--game-board-size)] grid-cols-[auto_minmax(0,1fr)_auto] items-center justify-self-center gap-2 max-sm:grid-cols-[minmax(0,1fr)_auto]">
            <h1 className="text-lg font-semibold text-[#765050] max-sm:col-span-2">Scrabble</h1>
            <ol
              aria-label="Scores"
              className="flex min-w-0 justify-center gap-1 max-sm:justify-start"
            >
              {game.players.map((player, index) => {
                const isCurrentPlayer = index === game.currentPlayerIndex;

                return (
                  <li
                    aria-current={isCurrentPlayer ? 'true' : undefined}
                    aria-label={`Player ${player.id}, ${player.score} points${
                      isCurrentPlayer ? ', current player' : ''
                    }`}
                    className={`flex min-w-0 items-center justify-center gap-1 rounded-lg border px-1.5 py-1 text-sm ${
                      isCurrentPlayer
                        ? 'border-[#765050] bg-[#f2eaea] font-semibold text-[#765050]'
                        : 'border-[#d9d3c4] bg-white/70 text-[#665b5b]'
                    }`}
                    key={player.id}
                  >
                    <span aria-hidden="true">P{player.id}</span>
                    <span aria-hidden="true">{player.score}</span>
                  </li>
                );
              })}
            </ol>
            <Button
              className="cursor-pointer rounded-lg border border-[#765050] px-2 py-1 text-sm font-semibold text-[#765050] outline-none transition hover:bg-[#f2eaea] focus-visible:ring-2 focus-visible:ring-[#765050]"
              onPress={quitGame}
            >
              Quit game
            </Button>
          </header>
          <div className="game-board-container flex min-h-0 min-w-0 items-center justify-center">
            <Board
              fitPlayerPanels
              placedTiles={game.placedTiles}
              pendingTileIds={game.pendingTileIds}
              onTileDrop={handleTileDrop}
            />
          </div>
          <Rack
            playerId={game.players[game.currentPlayerIndex].id}
            tiles={game.players[game.currentPlayerIndex].rack}
            onRackDrop={handleRackDrop}
            turnScore={turnResult?.score ?? null}
            onSubmitTurn={handleSubmitTurn}
            hasPendingTiles={game.pendingTileIds.length > 0}
            onReturnTiles={handleReturnAllTiles}
          />
        </>
      ) : (
        <section className="setup-layout grid justify-items-center gap-3">
          <h1 className="text-xl font-semibold text-[#765050]">Scrabble</h1>
          <Board />
        </section>
      )}
      <ModalOverlay
        className="fixed inset-0 z-10 grid place-items-center bg-black/35 p-3 backdrop-blur-[2px]"
        isDismissable={false}
        isOpen={game === null}
      >
        <Modal className="w-full max-w-sm">
          <Dialog className="rounded-2xl border border-[#d9d3c4] bg-[#fffefa] p-6 shadow-[0_20px_46px_rgba(47,47,47,0.2)]">
            <Heading className="text-2xl font-semibold text-[#765050]" slot="title">
              Start a game
            </Heading>
            <p className="mt-2 text-sm text-[#665b5b]">How many players?</p>
            <RadioGroup
              aria-label="Number of players"
              className="mt-4 grid gap-2"
              value={String(playerCount)}
              onChange={(value) => {
                const count = Number(value);
                if (isPlayerCount(count)) {
                  setPlayerCount(count);
                }
              }}
            >
              {PLAYER_COUNTS.map((count) => (
                <Radio
                  className="group flex cursor-pointer items-center gap-3 rounded-xl border border-[#d9d3c4] p-3 text-[#765050] outline-none transition data-[selected]:border-[#765050] data-[selected]:bg-[#f2eaea] focus-visible:ring-2 focus-visible:ring-[#765050]"
                  key={count}
                  value={String(count)}
                >
                  <span className="grid size-5 place-items-center rounded-full border border-[#ab9999] group-data-[selected]:border-[#765050]">
                    <span className="size-2.5 rounded-full bg-[#765050] opacity-0 group-data-[selected]:opacity-100" />
                  </span>
                  {count} players
                </Radio>
              ))}
            </RadioGroup>
            <Button
              className="mt-5 w-full cursor-pointer rounded-xl bg-[#765050] px-4 py-3 font-semibold text-white outline-none transition hover:bg-[#624141] focus-visible:ring-2 focus-visible:ring-[#765050] focus-visible:ring-offset-2"
              onPress={startGame}
            >
              Start game
            </Button>
          </Dialog>
        </Modal>
      </ModalOverlay>
      <ModalOverlay
        className="fixed inset-0 z-20 grid place-items-center bg-black/35 p-3 backdrop-blur-[2px]"
        isDismissable={false}
        isOpen={unassignedBlankTileId !== null}
      >
        <Modal className="w-full max-w-sm">
          <Dialog className="rounded-2xl border border-[#d9d3c4] bg-[#fffefa] p-6 shadow-[0_20px_46px_rgba(47,47,47,0.2)]">
            <Heading className="text-xl font-semibold text-[#765050]" slot="title">
              Choose a letter for the blank
            </Heading>
            <p className="mt-2 text-sm text-[#665b5b]">
              A blank tile is worth zero points and keeps this letter for the rest of the game.
            </p>
            <div className="mt-4 grid grid-cols-7 gap-1">
              {BOARD_LETTERS.map((letter) => (
                <Button
                  aria-label={`Use blank as ${letter}`}
                  className="rounded-lg border border-[#d9d3c4] py-2 font-semibold text-[#765050] outline-none hover:bg-[#f2eaea] focus-visible:ring-2 focus-visible:ring-[#765050]"
                  key={letter}
                  onPress={() => handleBlankAssignment(letter)}
                >
                  {letter}
                </Button>
              ))}
            </div>
          </Dialog>
        </Modal>
      </ModalOverlay>
    </main>
  );
}

export default App;
