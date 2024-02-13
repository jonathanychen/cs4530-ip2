import { Console } from 'console';
import { BOARD_POSITION_NOT_VALID_MESSAGE, GAME_FULL_MESSAGE, GAME_NOT_IN_PROGRESS_MESSAGE, GAME_NOT_STARTABLE_MESSAGE, MOVE_NOT_YOUR_TURN_MESSAGE, PLAYER_ALREADY_IN_GAME_MESSAGE, PLAYER_NOT_IN_GAME_MESSAGE, } from '../../lib/InvalidParametersError';
import { createPlayerForTesting } from '../../TestUtils';
import ConnectFourGame from './ConnectFourGame';
const logger = new Console(process.stdout, process.stderr);
function createMovesFromPattern(game, pattern, redID, yellowID, firstColor) {
    const queues = {
        Yellow: [],
        Red: [],
    };
    pattern.forEach((row, rowIdx) => {
        row.forEach((col, colIdx) => {
            if (col === 'Y') {
                queues.Yellow.push({
                    rowIdx: rowIdx,
                    colIdx: colIdx,
                });
            }
            else if (col === 'R') {
                queues.Red.push({
                    rowIdx: rowIdx,
                    colIdx: colIdx,
                });
            }
            else if (col !== '_') {
                throw new Error(`Invalid pattern: ${pattern}, expecting 2-d array of Y, R or _`);
            }
        });
    });
    const queueSorter = (a, b) => {
        function cellNumber(move) {
            return 6 * (5 - move.rowIdx) + move.colIdx;
        }
        return cellNumber(a) - cellNumber(b);
    };
    queues.Yellow.sort(queueSorter);
    queues.Red.sort(queueSorter);
    const colHeights = [5, 5, 5, 5, 5, 5, 5];
    const movesMade = [[], [], [], [], [], []];
    const makeMove = (color) => {
        const queue = queues[color];
        if (queue.length === 0)
            return;
        for (const move of queue) {
            if (move.rowIdx === colHeights[move.colIdx]) {
                game.applyMove({
                    gameID: game.id,
                    move: {
                        gamePiece: color,
                        col: move.colIdx,
                        row: move.rowIdx,
                    },
                    playerID: color === 'Red' ? redID : yellowID,
                });
                movesMade[move.rowIdx][move.colIdx] = color === 'Red' ? 'R' : 'Y';
                queues[color] = queue.filter(m => m !== move);
                colHeights[move.colIdx] -= 1;
                return;
            }
        }
        logger.table(pattern);
        logger.table(movesMade);
        throw new Error(`Unable to apply pattern: ${JSON.stringify(pattern, null, 2)}
      If this is a pattern in the autograder: are you sure that you checked for game-ending conditions? If this is a pattern you provided: please double-check your pattern - it may be invalid.`);
    };
    const gameOver = () => game.state.status === 'OVER';
    while (queues.Yellow.length > 0 || queues.Red.length > 0) {
        makeMove(firstColor);
        if (gameOver())
            return;
        makeMove(firstColor === 'Red' ? 'Yellow' : 'Red');
        if (gameOver())
            return;
    }
}
describe('ConnectFourGame', () => {
    let game;
    beforeEach(() => {
        game = new ConnectFourGame();
    });
    describe('[T1.1] _join', () => {
        it('should throw an error if the player is already in the game', () => {
            const player = createPlayerForTesting();
            game.join(player);
            expect(() => game.join(player)).toThrowError(PLAYER_ALREADY_IN_GAME_MESSAGE);
            const player2 = createPlayerForTesting();
            game.join(player2);
            expect(() => game.join(player2)).toThrowError(PLAYER_ALREADY_IN_GAME_MESSAGE);
        });
        it('should throw an error if the player is not in the game and the game is full', () => {
            const player1 = createPlayerForTesting();
            const player2 = createPlayerForTesting();
            const player3 = createPlayerForTesting();
            game.join(player1);
            game.join(player2);
            expect(() => game.join(player3)).toThrowError(GAME_FULL_MESSAGE);
        });
        describe('if the player is not in the game and the game is not full', () => {
            describe('if the player was not the yellow in the last game', () => {
                it('should add the player as red if red is empty', () => {
                    const red = createPlayerForTesting();
                    game.join(red);
                    expect(game.state.red).toBe(red.id);
                    expect(game.state.yellow).toBeUndefined();
                    expect(game.state.redReady).toBeFalsy();
                    expect(game.state.yellowReady).toBeFalsy();
                    expect(game.state.status).toBe('WAITING_FOR_PLAYERS');
                });
                it('should add the player as yellow if red is present', () => {
                    const red = createPlayerForTesting();
                    const yellow = createPlayerForTesting();
                    game.join(red);
                    expect(game.state.status).toBe('WAITING_FOR_PLAYERS');
                    game.join(yellow);
                    expect(game.state.red).toBe(red.id);
                    expect(game.state.yellow).toBe(yellow.id);
                    expect(game.state.redReady).toBeFalsy();
                    expect(game.state.yellowReady).toBeFalsy();
                    expect(game.state.status).toBe('WAITING_TO_START');
                });
            });
            describe('if the player was yellow in the last game', () => {
                it('should add the player as yellow if yellow is empty', () => {
                    const red = createPlayerForTesting();
                    const yellow = createPlayerForTesting();
                    game.join(red);
                    game.join(yellow);
                    expect(game.state.red).toBe(red.id);
                    expect(game.state.yellow).toBe(yellow.id);
                    const secondGame = new ConnectFourGame(game);
                    expect(secondGame.state.red).toBeUndefined();
                    expect(secondGame.state.yellow).toBeUndefined();
                    secondGame.join(yellow);
                    expect(secondGame.state.red).toBe(undefined);
                    expect(secondGame.state.yellow).toBe(yellow.id);
                    const newRed = createPlayerForTesting();
                    secondGame.join(newRed);
                    expect(secondGame.state.red).toBe(newRed.id);
                });
            });
            it('should set the status to WAITING_TO_START if both players are present', () => {
                const red = createPlayerForTesting();
                const yellow = createPlayerForTesting();
                game.join(red);
                game.join(yellow);
                expect(game.state.status).toBe('WAITING_TO_START');
                expect(game.state.redReady).toBeFalsy();
                expect(game.state.yellowReady).toBeFalsy();
            });
        });
    });
    describe('[T1.2] _startGame', () => {
        test('if the status is not WAITING_TO_START, it throws an error', () => {
            const player = createPlayerForTesting();
            game.join(player);
            expect(() => game.startGame(player)).toThrowError(GAME_NOT_STARTABLE_MESSAGE);
        });
        test('if the player is not in the game, it throws an error', () => {
            game.join(createPlayerForTesting());
            game.join(createPlayerForTesting());
            expect(() => game.startGame(createPlayerForTesting())).toThrowError(PLAYER_NOT_IN_GAME_MESSAGE);
        });
        describe('if the player is in the game', () => {
            const red = createPlayerForTesting();
            const yellow = createPlayerForTesting();
            beforeEach(() => {
                game.join(red);
                game.join(yellow);
            });
            test('if the player is red, it sets redReady to true', () => {
                game.startGame(red);
                expect(game.state.redReady).toBe(true);
                expect(game.state.yellowReady).toBeFalsy();
                expect(game.state.status).toBe('WAITING_TO_START');
            });
            test('if the player is yellow, it sets yellowReady to true', () => {
                game.startGame(yellow);
                expect(game.state.redReady).toBeFalsy();
                expect(game.state.yellowReady).toBe(true);
                expect(game.state.status).toBe('WAITING_TO_START');
            });
            test('if both players are ready, it sets the status to IN_PROGRESS', () => {
                game.startGame(red);
                game.startGame(yellow);
                expect(game.state.redReady).toBe(true);
                expect(game.state.yellowReady).toBe(true);
                expect(game.state.status).toBe('IN_PROGRESS');
            });
            test('if a player already reported ready, it does not change the status or throw an error', () => {
                game.startGame(red);
                game.startGame(red);
                expect(game.state.redReady).toBe(true);
                expect(game.state.yellowReady).toBeFalsy();
                expect(game.state.status).toBe('WAITING_TO_START');
            });
            test('if there are not any players from a prior game, it always sets the first player to red when the game starts', () => {
                game.startGame(red);
                game.startGame(yellow);
                game.leave(red);
                expect(game.state.status).toBe('OVER');
                const secondGame = new ConnectFourGame(game);
                secondGame.join(red);
                expect(secondGame.state.red).toBe(red.id);
                const newYellow = createPlayerForTesting();
                secondGame.join(newYellow);
                expect(secondGame.state.yellow).toBe(newYellow.id);
                secondGame.leave(red);
                const newRed = createPlayerForTesting();
                secondGame.join(newRed);
                secondGame.startGame(newYellow);
                secondGame.startGame(newRed);
                expect(secondGame.state.firstPlayer).toBe('Red');
            });
            test('if there are players from a prior game, it sets the first player to the player who was not first in the last game', () => {
                game.startGame(red);
                game.startGame(yellow);
                game.leave(red);
                const secondGame = new ConnectFourGame(game);
                const newRed = createPlayerForTesting();
                secondGame.join(newRed);
                secondGame.join(yellow);
                secondGame.startGame(newRed);
                secondGame.startGame(yellow);
                expect(secondGame.state.firstPlayer).toBe('Yellow');
            });
        });
    });
    describe('[T1.3] _leave', () => {
        it('should throw an error if the player is not in the game', () => {
            const player = createPlayerForTesting();
            expect(() => game.leave(player)).toThrowError(PLAYER_NOT_IN_GAME_MESSAGE);
            game.join(player);
            expect(() => game.leave(createPlayerForTesting())).toThrowError(PLAYER_NOT_IN_GAME_MESSAGE);
        });
        describe('when the player is in the game', () => {
            describe('when the game is in progress', () => {
                test('if the player is red, it sets the winner to yellow and status to OVER', () => {
                    const red = createPlayerForTesting();
                    const yellow = createPlayerForTesting();
                    game.join(red);
                    game.join(yellow);
                    game.startGame(red);
                    game.startGame(yellow);
                    game.leave(red);
                    expect(game.state.winner).toBe(yellow.id);
                    expect(game.state.status).toBe('OVER');
                });
                test('if the player is yellow, it sets the winner to red and status to OVER', () => {
                    const red = createPlayerForTesting();
                    const yellow = createPlayerForTesting();
                    game.join(red);
                    game.join(yellow);
                    game.startGame(red);
                    game.startGame(yellow);
                    game.leave(yellow);
                    expect(game.state.winner).toBe(red.id);
                    expect(game.state.status).toBe('OVER');
                });
            });
            test('when the game is already over before the player leaves, it does not update the state', () => {
                const red = createPlayerForTesting();
                const yellow = createPlayerForTesting();
                game.join(red);
                game.join(yellow);
                game.startGame(red);
                game.startGame(yellow);
                expect(game.state.yellow).toBe(yellow.id);
                expect(game.state.red).toBe(red.id);
                game.leave(red);
                expect(game.state.status).toBe('OVER');
                const stateBeforeLeaving = { ...game.state };
                game.leave(yellow);
                expect(game.state).toEqual(stateBeforeLeaving);
            });
            describe('when the game is waiting to start, with status WAITING_TO_START', () => {
                test('if the player is red, it sets red to undefined and status to WAITING_FOR_PLAYERS', () => {
                    const red = createPlayerForTesting();
                    const yellow = createPlayerForTesting();
                    game.join(red);
                    expect(game.state.redReady).toBeFalsy();
                    game.join(yellow);
                    game.startGame(red);
                    expect(game.state.redReady).toBeTruthy();
                    game.leave(red);
                    expect(game.state.redReady).toBeFalsy();
                    expect(game.state.red).toBeUndefined();
                    expect(game.state.status).toBe('WAITING_FOR_PLAYERS');
                });
                test('if the player is yellow, it sets yellow to undefined and status to WAITING_FOR_PLAYERS', () => {
                    const red = createPlayerForTesting();
                    const yellow = createPlayerForTesting();
                    game.join(red);
                    game.join(yellow);
                    expect(game.state.yellowReady).toBeFalsy();
                    game.startGame(yellow);
                    expect(game.state.yellowReady).toBeTruthy();
                    game.leave(yellow);
                    expect(game.state.yellowReady).toBeFalsy();
                    expect(game.state.yellow).toBeUndefined();
                    expect(game.state.status).toBe('WAITING_FOR_PLAYERS');
                });
                test('if the player is red, and the "preferred yellow" player joins, it should add the player as red', () => {
                    const red = createPlayerForTesting();
                    const yellow = createPlayerForTesting();
                    game.join(red);
                    game.join(yellow);
                    expect(game.state.red).toBe(red.id);
                    expect(game.state.yellow).toBe(yellow.id);
                    expect(game.state.redReady).toBeFalsy();
                    expect(game.state.yellowReady).toBeFalsy();
                    expect(game.state.status).toBe('WAITING_TO_START');
                    const secondGame = new ConnectFourGame(game);
                    expect(secondGame.state.red).toBeUndefined();
                    expect(secondGame.state.yellow).toBeUndefined();
                    const newRed = createPlayerForTesting();
                    secondGame.join(newRed);
                    expect(secondGame.state.red).toBe(newRed.id);
                    const newYellow = createPlayerForTesting();
                    secondGame.join(newYellow);
                    expect(secondGame.state.yellow).toBe(newYellow.id);
                    secondGame.leave(newRed);
                    secondGame.join(yellow);
                    expect(secondGame.state.red).toBe(yellow.id);
                    expect(secondGame.state.yellow).toBe(newYellow.id);
                });
            });
            describe('when the game is waiting for players, in state WAITING_FOR_PLAYERS', () => {
                test('if the player is red, it sets red to undefined, redReady to false and status remains WAITING_FOR_PLAYERS', () => {
                    const red = createPlayerForTesting();
                    game.join(red);
                    expect(game.state.status).toBe('WAITING_FOR_PLAYERS');
                    game.leave(red);
                    expect(game.state.red).toBeUndefined();
                    expect(game.state.redReady).toBeFalsy();
                    expect(game.state.status).toBe('WAITING_FOR_PLAYERS');
                });
                test('if the player is yellow, it sets yellow to undefined, yellowReady to false and status remains WAITING_FOR_PLAYERS', () => {
                    const red = createPlayerForTesting();
                    const yellow = createPlayerForTesting();
                    game.join(red);
                    game.join(yellow);
                    game.leave(red);
                    const secondGame = new ConnectFourGame(game);
                    secondGame.join(yellow);
                    expect(secondGame.state.yellow).toBe(yellow.id);
                    expect(secondGame.state.status).toBe('WAITING_FOR_PLAYERS');
                    secondGame.leave(yellow);
                    expect(secondGame.state.yellow).toBeUndefined();
                    expect(secondGame.state.yellowReady).toBeFalsy();
                    expect(secondGame.state.status).toBe('WAITING_FOR_PLAYERS');
                });
            });
        });
    });
    describe('applyMove', () => {
        const red = createPlayerForTesting();
        const yellow = createPlayerForTesting();
        beforeEach(() => {
            game.join(red);
            game.join(yellow);
            game.startGame(red);
            game.startGame(yellow);
        });
        describe('[T2.1] Determining who is the first player', () => {
            test('If there is no prior game, the first player is red', () => {
                expect(game.state.firstPlayer).toEqual('Red');
            });
            test('If there is a prior game, and both players join this one, then the first player is the player who was NOT first in the last game', () => {
                expect(game.state.firstPlayer).toEqual('Red');
                const game2 = new ConnectFourGame(game);
                game2.join(red);
                game2.join(yellow);
                game2.startGame(red);
                game2.startGame(yellow);
                expect(game2.state.firstPlayer).toEqual('Yellow');
            });
            test('If there is a prior game, and only one player joins this one, then that player will be first if they were NOT first in the last game', () => {
                expect(game.state.firstPlayer).toEqual('Red');
                const game2 = new ConnectFourGame(game);
                const newPlayer = createPlayerForTesting();
                game2.join(newPlayer);
                game2.join(yellow);
                game2.startGame(newPlayer);
                game2.startGame(yellow);
                expect(game2.state.firstPlayer).toEqual('Yellow');
                const game3 = new ConnectFourGame(game2);
                const newPlayer2 = createPlayerForTesting();
                game3.join(newPlayer2);
                game3.join(yellow);
                game3.startGame(newPlayer2);
                game3.startGame(yellow);
                expect(game3.state.firstPlayer).toEqual('Red');
            });
        });
        describe('[T2.2] when given a valid move', () => {
            it.each([0, 1, 2, 3, 4, 5, 6])('should add the move to the game state in column %d and not end the game', (col) => {
                game.applyMove({
                    gameID: game.id,
                    playerID: red.id,
                    move: { gamePiece: 'Red', col: col, row: 5 },
                });
                expect(game.state.moves[0]).toEqual({
                    gamePiece: 'Red',
                    col: col,
                    row: 5,
                });
                expect(game.state.status).toBe('IN_PROGRESS');
            });
            it.each([0, 1, 2, 3, 4, 5])('should permit stacking the moves in column %d and not end the game if the move does not win', (col) => {
                for (let i = 0; i < 3; i++) {
                    game.applyMove({
                        gameID: game.id,
                        playerID: red.id,
                        move: {
                            gamePiece: 'Red',
                            col: col,
                            row: (5 - 2 * i),
                        },
                    });
                    game.applyMove({
                        gameID: game.id,
                        playerID: yellow.id,
                        move: {
                            gamePiece: 'Yellow',
                            col: col,
                            row: (4 - 2 * i),
                        },
                    });
                }
                for (let i = 0; i < 3; i++) {
                    expect(game.state.moves[2 * i]).toEqual({
                        gamePiece: 'Red',
                        col: col,
                        row: (5 - 2 * i),
                    });
                    expect(game.state.moves[2 * i + 1]).toEqual({
                        gamePiece: 'Yellow',
                        col: col,
                        row: (4 - 2 * i),
                    });
                }
                expect(game.state.status).toBe('IN_PROGRESS');
            });
        });
        describe('[T2.3] when given a move that wins the game, it ends the game and declares the winner', () => {
            test('horizontal wins in the first row', () => {
                createMovesFromPattern(game, [[], [], [], [], [], ['Y', 'Y', 'Y', 'R', 'R', 'R', 'R']], red.id, yellow.id, 'Red');
                expect(game.state.status).toBe('OVER');
                expect(game.state.winner).toBe(red.id);
                const secondGame = new ConnectFourGame(game);
                secondGame.join(red);
                secondGame.join(yellow);
                secondGame.startGame(red);
                secondGame.startGame(yellow);
                createMovesFromPattern(secondGame, [
                    [],
                    [],
                    [],
                    [],
                    ['R', 'R', 'R', 'Y', 'R', 'R', 'R'],
                    ['Y', 'Y', 'R', 'Y', 'Y', 'Y', 'Y'],
                ], red.id, yellow.id, 'Yellow');
                const thirdGame = new ConnectFourGame(secondGame);
                thirdGame.join(red);
                thirdGame.join(yellow);
                thirdGame.startGame(red);
                thirdGame.startGame(yellow);
                createMovesFromPattern(thirdGame, [[], [], [], [], ['R', 'R', 'R'], ['Y', 'Y', 'Y', 'Y', 'R', 'R', 'R']], red.id, yellow.id, 'Red');
            });
            test('horizontal wins in the top row', () => {
                const pattern = [
                    ['R', 'R', 'R', 'R', 'Y', 'Y', 'Y'],
                    ['Y', 'R', 'Y', 'Y', 'R', 'Y', 'Y'],
                    ['R', 'Y', 'Y', 'Y', 'R', 'R', 'R'],
                    ['Y', 'R', 'Y', 'Y', 'R', 'Y', 'Y'],
                    ['Y', 'R', 'R', 'R', 'Y', 'R', 'R'],
                    ['Y', 'R', 'Y', 'Y', 'R', 'R', 'R'],
                ];
                createMovesFromPattern(game, pattern, red.id, yellow.id, 'Red');
                expect(game.state.status).toBe('OVER');
                expect(game.state.winner).toBe(red.id);
            });
            test('horizontal wins right aligned', () => {
                const pattern = [
                    ['Y', 'Y', 'Y', 'R', 'R', 'R', 'R'],
                    ['Y', 'R', 'Y', 'Y', 'R', 'Y', 'Y'],
                    ['R', 'Y', 'R', 'Y', 'Y', 'R', 'R'],
                    ['Y', 'R', 'Y', 'Y', 'R', 'Y', 'Y'],
                    ['Y', 'R', 'R', 'R', 'Y', 'R', 'R'],
                    ['Y', 'R', 'Y', 'Y', 'R', 'R', 'R'],
                ];
                createMovesFromPattern(game, pattern, red.id, yellow.id, 'Red');
                expect(game.state.status).toBe('OVER');
                expect(game.state.winner).toBe(red.id);
            });
            test('vertical wins', () => {
                const pattern = [[], [], ['R'], ['R'], ['R', 'Y'], ['R', 'Y', 'Y', 'Y']];
                createMovesFromPattern(game, pattern, red.id, yellow.id, 'Red');
                expect(game.state.status).toBe('OVER');
                expect(game.state.winner).toBe(red.id);
                const secondGame = new ConnectFourGame(game);
                secondGame.join(red);
                secondGame.join(yellow);
                secondGame.startGame(red);
                secondGame.startGame(yellow);
                const secondPattern = [
                    [],
                    [],
                    ['_', '_', '_', '_', '_', 'Y'],
                    ['_', '_', '_', '_', '_', 'Y'],
                    ['_', '_', '_', '_', '_', 'Y'],
                    ['R', 'R', 'R', 'Y', 'R', 'Y'],
                ];
                createMovesFromPattern(secondGame, secondPattern, red.id, yellow.id, 'Yellow');
                expect(secondGame.state.status).toBe('OVER');
                expect(secondGame.state.winner).toBe(yellow.id);
            });
            test.each([
                {
                    board: [
                        ['_', '_', '_', '_', '_', '_', '_'],
                        ['_', '_', '_', '_', '_', '_', '_'],
                        ['_', '_', 'Y', 'R', '_', '_', '_'],
                        ['_', '_', 'R', 'R', '_', '_', '_'],
                        ['_', 'R', 'Y', 'Y', '_', '_', '_'],
                        ['R', 'R', 'Y', 'Y', '_', '_', '_'],
                    ],
                    expectedWinner: 'Red',
                },
                {
                    board: [
                        ['_', '_', '_', '_', '_', 'R', 'Y'],
                        ['_', '_', '_', '_', '_', 'Y', 'R'],
                        ['_', '_', '_', '_', 'Y', 'Y', 'R'],
                        ['_', '_', '_', 'Y', 'R', 'Y', 'R'],
                        ['_', '_', '_', 'R', 'Y', 'R', 'Y'],
                        ['_', '_', '_', 'Y', 'R', 'R', 'R'],
                    ],
                    expectedWinner: 'Yellow',
                },
                {
                    board: [
                        ['_', '_', '_', '_', '_', 'R', 'Y'],
                        ['_', '_', '_', '_', '_', 'Y', 'R'],
                        ['_', '_', '_', '_', 'R', 'Y', 'Y'],
                        ['_', '_', '_', 'Y', 'R', 'Y', 'R'],
                        ['_', '_', '_', 'R', 'Y', 'R', 'Y'],
                        ['_', '_', '_', 'Y', 'R', 'R', 'R'],
                    ],
                    expectedWinner: 'Yellow',
                },
                {
                    board: [
                        [],
                        ['Y', 'R', 'Y', 'R', 'Y'],
                        ['Y', 'R', 'R', 'Y', 'Y'],
                        ['R', 'Y', 'Y', 'Y', 'R'],
                        ['R', 'R', 'Y', 'Y', 'R'],
                        ['R', 'Y', 'Y', 'Y', 'R'],
                    ],
                    expectedWinner: 'Yellow',
                },
                {
                    board: [
                        ['_', '_', '_', '_', '_', '_', '_'],
                        ['_', '_', '_', '_', '_', '_', '_'],
                        ['_', '_', '_', 'Y', '_', '_', '_'],
                        ['_', '_', '_', 'R', 'Y', '_', '_'],
                        ['_', '_', '_', 'R', 'R', 'Y', '_'],
                        ['_', '_', '_', 'Y', 'R', 'R', 'Y'],
                    ],
                    expectedWinner: 'Yellow',
                },
            ])('diagonal wins', ({ board, expectedWinner }) => {
                createMovesFromPattern(game, board, red.id, yellow.id, 'Red');
                expect(game.state.status).toBe('OVER');
                expect(game.state.winner).toBe(expectedWinner === 'Red' ? red.id : yellow.id);
            });
        });
        describe('[T2.3] when given a move that does not win the game, it does not end it', () => {
            test('Near-win horizontally', () => {
                createMovesFromPattern(game, [
                    ['_', '_', '_', '_', '_', '_', '_'],
                    ['_', '_', '_', '_', '_', '_', '_'],
                    ['_', '_', '_', '_', '_', '_', '_'],
                    ['_', '_', '_', '_', '_', '_', '_'],
                    ['_', 'Y', 'Y', 'Y', '_', '_', '_'],
                    ['_', 'R', 'R', 'R', '_', '_', '_'],
                ], red.id, yellow.id, 'Red');
                expect(game.state.status).toBe('IN_PROGRESS');
                expect(game.state.winner).toBeUndefined();
            });
            test('Near-win vertically', () => {
                createMovesFromPattern(game, [
                    ['_', '_', '_', '_', '_', '_', '_'],
                    ['_', '_', '_', '_', '_', '_', '_'],
                    ['_', '_', '_', '_', '_', '_', '_'],
                    ['R', 'Y', '_', '_', '_', '_', '_'],
                    ['R', 'Y', '_', '_', '_', '_', '_'],
                    ['R', 'Y', '_', '_', '_', '_', '_'],
                ], red.id, yellow.id, 'Red');
                expect(game.state.status).toBe('IN_PROGRESS');
                expect(game.state.winner).toBeUndefined();
            });
            test.each([
                {
                    board: [
                        ['_', '_', '_', '_', '_', '_', '_'],
                        ['_', '_', '_', '_', '_', '_', '_'],
                        ['_', '_', '_', '_', '_', '_', '_'],
                        ['_', '_', 'R', 'Y', '_', '_', '_'],
                        ['Y', 'R', 'R', 'Y', '_', '_', '_'],
                        ['R', 'Y', 'R', 'Y', '_', '_', '_'],
                    ],
                    expectedWinner: undefined,
                },
                {
                    board: [
                        ['R', 'Y', '_', '_', '_', '_', '_'],
                        ['Y', 'R', '_', '_', '_', '_', '_'],
                        ['Y', 'R', 'Y', 'R', '_', '_', '_'],
                        ['R', 'Y', 'Y', 'R', '_', '_', '_'],
                        ['Y', 'R', 'R', 'Y', '_', '_', '_'],
                        ['R', 'Y', 'R', 'R', 'Y', '_', '_'],
                    ],
                    expectedWinner: undefined,
                },
            ])('Near-win diagonally', ({ board }) => {
                createMovesFromPattern(game, board, red.id, yellow.id, 'Red');
                expect(game.state.status).toBe('IN_PROGRESS');
                expect(game.state.winner).toBeUndefined();
            });
        });
        it('[T2.3] should declare a tie if the board is full and no one has won', () => {
            createMovesFromPattern(game, [
                ['Y', 'R', 'R', 'R', 'Y', 'R', 'Y'],
                ['Y', 'R', 'Y', 'Y', 'R', 'Y', 'Y'],
                ['R', 'Y', 'Y', 'Y', 'R', 'R', 'R'],
                ['Y', 'R', 'Y', 'Y', 'R', 'Y', 'Y'],
                ['Y', 'R', 'R', 'R', 'Y', 'R', 'R'],
                ['Y', 'R', 'Y', 'Y', 'R', 'R', 'R'],
            ], red.id, yellow.id, 'Red');
            expect(game.state.status).toBe('OVER');
            expect(game.state.winner).toBeUndefined();
        });
    });
    describe('[T2.4] when given an invalid move request', () => {
        it('throws an error if the game is not in progress', () => {
            const player = createPlayerForTesting();
            game.join(player);
            expect(() => game.applyMove({
                gameID: game.id,
                playerID: player.id,
                move: { gamePiece: 'Red', col: 0, row: 0 },
            })).toThrowError(GAME_NOT_IN_PROGRESS_MESSAGE);
        });
        describe('when the game is in progress', () => {
            const red = createPlayerForTesting();
            const yellow = createPlayerForTesting();
            beforeEach(() => {
                game.join(red);
                game.join(yellow);
                game.startGame(red);
                game.startGame(yellow);
            });
            it('should throw an error if the player is not in the game', () => {
                const otherPlayer = createPlayerForTesting();
                expect(() => game.applyMove({
                    gameID: game.id,
                    playerID: otherPlayer.id,
                    move: { gamePiece: 'Red', col: 0, row: 5 },
                })).toThrowError(PLAYER_NOT_IN_GAME_MESSAGE);
            });
            describe('when the player is in the game', () => {
                it('should throw an error if the player is not the active player', () => {
                    expect(() => game.applyMove({
                        gameID: game.id,
                        playerID: yellow.id,
                        move: { gamePiece: 'Yellow', col: 0, row: 5 },
                    })).toThrowError(MOVE_NOT_YOUR_TURN_MESSAGE);
                    const secondGame = new ConnectFourGame(game);
                    secondGame.join(red);
                    secondGame.join(yellow);
                    secondGame.startGame(yellow);
                    secondGame.startGame(red);
                    expect(() => secondGame.applyMove({
                        gameID: secondGame.id,
                        playerID: red.id,
                        move: { gamePiece: 'Red', col: 0, row: 5 },
                    })).toThrowError(MOVE_NOT_YOUR_TURN_MESSAGE);
                });
                it('should throw an error if the cell is not at the bottom of the column', () => {
                    createMovesFromPattern(game, [
                        ['_', '_', '_', '_', '_', '_'],
                        ['_', '_', '_', '_', '_', '_'],
                        ['_', '_', '_', '_', '_', '_'],
                        ['Y', '_', '_', '_', '_', '_'],
                        ['R', '_', '_', '_', '_', '_'],
                        ['R', 'Y', '_', '_', '_', '_'],
                    ], red.id, yellow.id, 'Red');
                    expect(() => game.applyMove({
                        gameID: game.id,
                        playerID: red.id,
                        move: { gamePiece: 'Red', col: 0, row: 1 },
                    })).toThrowError(BOARD_POSITION_NOT_VALID_MESSAGE);
                });
                it('should throw an error if the cell is full', () => {
                    createMovesFromPattern(game, [
                        ['Y', '_', '_', '_', '_', '_'],
                        ['R', '_', '_', '_', '_', '_'],
                        ['Y', '_', '_', '_', '_', '_'],
                        ['R', '_', '_', '_', '_', '_'],
                        ['Y', '_', '_', '_', '_', '_'],
                        ['R', '_', '_', '_', '_', '_'],
                    ], red.id, yellow.id, 'Red');
                    expect(() => game.applyMove({
                        gameID: game.id,
                        playerID: red.id,
                        move: { gamePiece: 'Red', col: 0, row: 0 },
                    })).toThrowError(BOARD_POSITION_NOT_VALID_MESSAGE);
                });
                it('should not change the game state', () => {
                    createMovesFromPattern(game, [
                        ['Y', '_', '_', '_', '_', '_'],
                        ['R', '_', '_', '_', '_', '_'],
                        ['Y', '_', '_', '_', '_', '_'],
                        ['R', '_', '_', '_', '_', '_'],
                        ['Y', '_', '_', '_', '_', '_'],
                        ['R', '_', '_', '_', '_', '_'],
                    ], red.id, yellow.id, 'Red');
                    expect(game.state.moves.length).toBe(6);
                    expect(() => game.applyMove({
                        gameID: game.id,
                        playerID: red.id,
                        move: { gamePiece: 'Red', col: 0, row: 0 },
                    })).toThrowError(BOARD_POSITION_NOT_VALID_MESSAGE);
                    expect(game.state.moves.length).toBe(6);
                    game.applyMove({
                        gameID: game.id,
                        playerID: red.id,
                        move: { gamePiece: 'Red', col: 1, row: 5 },
                    });
                    expect(game.state.moves.length).toBe(7);
                });
            });
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQ29ubmVjdEZvdXJHYW1lLnRlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvdG93bi9nYW1lcy9Db25uZWN0Rm91ckdhbWUudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sU0FBUyxDQUFDO0FBQ2xDLE9BQU8sRUFDTCxnQ0FBZ0MsRUFDaEMsaUJBQWlCLEVBQ2pCLDRCQUE0QixFQUM1QiwwQkFBMEIsRUFDMUIsMEJBQTBCLEVBQzFCLDhCQUE4QixFQUM5QiwwQkFBMEIsR0FDM0IsTUFBTSxrQ0FBa0MsQ0FBQztBQUMxQyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQU16RCxPQUFPLGVBQWUsTUFBTSxtQkFBbUIsQ0FBQztBQU9oRCxNQUFNLE1BQU0sR0FBRyxJQUFJLE9BQU8sQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztBQW9CM0QsU0FBUyxzQkFBc0IsQ0FDN0IsSUFBcUIsRUFDckIsT0FBbUIsRUFDbkIsS0FBYSxFQUNiLFFBQWdCLEVBQ2hCLFVBQTRCO0lBRzVCLE1BQU0sTUFBTSxHQUFHO1FBQ2IsTUFBTSxFQUFFLEVBQWtCO1FBQzFCLEdBQUcsRUFBRSxFQUFrQjtLQUN4QixDQUFDO0lBR0YsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEdBQUcsRUFBRSxNQUFNLEVBQUUsRUFBRTtRQUM5QixHQUFHLENBQUMsT0FBTyxDQUFDLENBQUMsR0FBRyxFQUFFLE1BQU0sRUFBRSxFQUFFO1lBQzFCLElBQUksR0FBRyxLQUFLLEdBQUcsRUFBRSxDQUFDO2dCQUNoQixNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQztvQkFDakIsTUFBTSxFQUFFLE1BQTZCO29CQUNyQyxNQUFNLEVBQUUsTUFBNkI7aUJBQ3RDLENBQUMsQ0FBQztZQUNMLENBQUM7aUJBQU0sSUFBSSxHQUFHLEtB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SSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDcEIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDdkIsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDaEIsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUV2QyxNQUFNLFVBQVUsR0FBRyxJQUFJLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDN0MsVUFBVSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDckIsTUFBTSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFDMUMsTUFBTSxTQUFTLEdBQUcsc0JBQXNCLEVBQUUsQ0FBQztnQkFDM0MsVUFBVSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztnQkFDM0IsTUFBTSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFDbkQsVUFBVSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFHdEIsTUFBTSxNQUFNLEdBQUcsc0JBQXNCLEVBQUUsQ0FBQztnQkFDeEMsVUFBVSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDeEIsVUFBVSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsQ0FBQztnQkFDaEMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDN0IsTUFBTSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ25ELENBQUMsQ0FBQyxDQUFDO1lBQ0gsSUFBSSxDQUFDLG1IQUFtSCxFQUFFLEdBQUcsRUFBRTtnQkFDN0gsSUFBSSxDQUFD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RSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDO3dCQUNuQyxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQzt3QkFDbkMsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUM7d0JBQ25DLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDO3dCQUNuQyxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQztxQkFDcEM7b0JBQ0QsY0FBYyxFQUFFLFNBQVM7aUJBQzFCO2dCQUNEO29CQUNFLEtBQUssRUFBRTt3QkFDTCxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQzt3QkFDbkMsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUM7d0JBQ25DLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDO3dCQUNuQyxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQzt3QkFDbkMsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUM7d0JBQ25DLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdB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