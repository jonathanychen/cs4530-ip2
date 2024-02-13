import { mock } from 'jest-mock-extended';
import { nanoid } from 'nanoid';
import { createPlayerForTesting } from '../../TestUtils';
import { GAME_ID_MISSMATCH_MESSAGE, GAME_NOT_IN_PROGRESS_MESSAGE, INVALID_COMMAND_MESSAGE, } from '../../lib/InvalidParametersError';
import TicTacToeGameArea from './TicTacToeGameArea';
import * as TicTacToeGameModule from './TicTacToeGame';
import Game from './Game';
class TestingGame extends Game {
    constructor() {
        super({
            moves: [],
            status: 'WAITING_TO_START',
        });
    }
    applyMove() { }
    endGame(winner) {
        this.state = {
            ...this.state,
            status: 'OVER',
            winner,
        };
    }
    _join(player) {
        if (this.state.x) {
            this.state.o = player.id;
        }
        else {
            this.state.x = player.id;
        }
        this._players.push(player);
    }
    _leave() { }
}
describe('TicTacToeGameArea', () => {
    let gameArea;
    let player1;
    let player2;
    let interactableUpdateSpy;
    let game;
    beforeEach(() => {
        const gameConstructorSpy = jest.spyOn(TicTacToeGameModule, 'default');
        game = new TestingGame();
        gameConstructorSpy.mockReturnValue(game);
        player1 = createPlayerForTesting();
        player2 = createPlayerForTesting();
        gameArea = new TicTacToeGameArea(nanoid(), { x: 0, y: 0, width: 100, height: 100 }, mock());
        gameArea.add(player1);
        gameArea.add(player2);
        interactableUpdateSpy = jest.spyOn(gameArea, '_emitAreaChanged');
    });
    describe('handleCommand', () => {
        describe('[T3.1] when given a JoinGame command', () => {
            describe('when there is no game in progress', () => {
                it('should create a new game and call _emitAreaChanged', () => {
                    const { gameID } = gameArea.handleCommand({ type: 'JoinGame' }, player1);
                    expect(gameID).toBeDefined();
                    if (!game) {
                        throw new Error('Game was not created by the first call to join');
                    }
                    expect(gameID).toEqual(game.id);
                    expect(interactableUpdateSpy).toHaveBeenCalledTimes(1);
                });
            });
            describe('when there is a game in progress', () => {
                it('should dispatch the join command to the game and call _emitAreaChanged', () => {
                    const { gameID } = gameArea.handleCommand({ type: 'JoinGame' }, player1);
                    if (!game) {
                        throw new Error('Game was not created by the first call to join');
                    }
                    expect(interactableUpdateSpy).toHaveBeenCalledTimes(1);
                    const joinSpy = jest.spyOn(game, 'join');
                    const gameID2 = gameArea.handleCommand({ type: 'JoinGame' }, player2).gameID;
                    expect(joinSpy).toHaveBeenCalledWith(player2);
                    expect(gameID).toEqual(gameID2);
                    expect(interactableUpdateSpy).toHaveBeenCalledTimes(2);
                });
                it('should not call _emitAreaChanged if the game throws an error', () => {
                    gameArea.handleCommand({ type: 'JoinGame' }, player1);
                    if (!game) {
                        throw new Error('Game was not created by the first call to join');
                    }
                    interactableUpdateSpy.mockClear();
                    const joinSpy = jest.spyOn(game, 'join').mockImplementationOnce(() => {
                        throw new Error('Test Error');
                    });
                    expect(() => gameArea.handleCommand({ type: 'JoinGame' }, player2)).toThrowError('Test Error');
                    expect(joinSpy).toHaveBeenCalledWith(player2);
                    expect(interactableUpdateSpy).not.toHaveBeenCalled();
                });
            });
        });
        describe('[T3.2] when given a GameMove command', () => {
            it('should throw an error when there is no game in progress', () => {
                expect(() => gameArea.handleCommand({ type: 'GameMove', move: { col: 0, row: 0, gamePiece: 'X' }, gameID: nanoid() }, player1)).toThrowError(GAME_NOT_IN_PROGRESS_MESSAGE);
            });
            describe('when there is a game in progress', () => {
                let gameID;
                beforeEach(() => {
                    gameID = gameArea.handleCommand({ type: 'JoinGame' }, player1).gameID;
                    gameArea.handleCommand({ type: 'JoinGame' }, player2);
                    interactableUpdateSpy.mockClear();
                });
                it('should throw an error when the game ID does not match', () => {
                    expect(() => gameArea.handleCommand({ type: 'GameMove', move: { col: 0, row: 0, gamePiece: 'X' }, gameID: nanoid() }, player1)).toThrowError(GAME_ID_MISSMATCH_MESSAGE);
                });
                it('should dispatch the move to the game and call _emitAreaChanged', () => {
                    const move = { col: 0, row: 0, gamePiece: 'X' };
                    const applyMoveSpy = jest.spyOn(game, 'applyMove');
                    gameArea.handleCommand({ type: 'GameMove', move, gameID }, player1);
                    expect(applyMoveSpy).toHaveBeenCalledWith({
                        gameID: game.id,
                        playerID: player1.id,
                        move: {
                            ...move,
                            gamePiece: 'X',
                        },
                    });
                    expect(interactableUpdateSpy).toHaveBeenCalledTimes(1);
                });
                it('should not call _emitAreaChanged if the game throws an error', () => {
                    const move = { col: 0, row: 0, gamePiece: 'X' };
                    const applyMoveSpy = jest.spyOn(game, 'applyMove').mockImplementationOnce(() => {
                        throw new Error('Test Error');
                    });
                    expect(() => gameArea.handleCommand({ type: 'GameMove', move, gameID }, player1)).toThrowError('Test Error');
                    expect(applyMoveSpy).toHaveBeenCalledWith({
                        gameID: game.id,
                        playerID: player1.id,
                        move: {
                            ...move,
                            gamePiece: 'X',
                        },
                    });
                    expect(interactableUpdateSpy).not.toHaveBeenCalled();
                });
                describe('when the game is over, it records a new row in the history and calls _emitAreaChanged', () => {
                    test('when X wins', () => {
                        const move = { col: 0, row: 0, gamePiece: 'X' };
                        jest.spyOn(game, 'applyMove').mockImplementationOnce(() => {
                            game.endGame(player1.id);
                        });
                        gameArea.handleCommand({ type: 'GameMove', move, gameID }, player1);
                        expect(game.state.status).toEqual('OVER');
                        expect(gameArea.history.length).toEqual(1);
                        expect(gameArea.history[0]).toEqual({
                            gameID: game.id,
                            scores: {
                                [player1.userName]: 1,
                                [player2.userName]: 0,
                            },
                        });
                        expect(interactableUpdateSpy).toHaveBeenCalledTimes(1);
                    });
                    test('when O wins', () => {
                        const move = { col: 0, row: 0, gamePiece: 'O' };
                        jest.spyOn(game, 'applyMove').mockImplementationOnce(() => {
                            game.endGame(player2.id);
                        });
                        gameArea.handleCommand({ type: 'GameMove', move, gameID }, player2);
                        expect(game.state.status).toEqual('OVER');
                        expect(gameArea.history.length).toEqual(1);
                        expect(gameArea.history[0]).toEqual({
                            gameID: game.id,
                            scores: {
                                [player1.userName]: 0,
                                [player2.userName]: 1,
                            },
                        });
                        expect(interactableUpdateSpy).toHaveBeenCalledTimes(1);
                    });
                    test('when there is a tie', () => {
                        const move = { col: 0, row: 0, gamePiece: 'X' };
                        jest.spyOn(game, 'applyMove').mockImplementationOnce(() => {
                            game.endGame();
                        });
                        gameArea.handleCommand({ type: 'GameMove', move, gameID }, player1);
                        expect(game.state.status).toEqual('OVER');
                        expect(gameArea.history.length).toEqual(1);
                        expect(gameArea.history[0]).toEqual({
                            gameID: game.id,
                            scores: {
                                [player1.userName]: 0,
                                [player2.userName]: 0,
                            },
                        });
                        expect(interactableUpdateSpy).toHaveBeenCalledTimes(1);
                    });
                });
            });
        });
        describe('[T3.3] when given a LeaveGame command', () => {
            describe('when there is no game in progress', () => {
                it('should throw an error', () => {
                    expect(() => gameArea.handleCommand({ type: 'LeaveGame', gameID: nanoid() }, player1)).toThrowError(GAME_NOT_IN_PROGRESS_MESSAGE);
                    expect(interactableUpdateSpy).not.toHaveBeenCalled();
                });
            });
            describe('when there is a game in progress', () => {
                it('should throw an error when the game ID does not match', () => {
                    gameArea.handleCommand({ type: 'JoinGame' }, player1);
                    interactableUpdateSpy.mockClear();
                    expect(() => gameArea.handleCommand({ type: 'LeaveGame', gameID: nanoid() }, player1)).toThrowError(GAME_ID_MISSMATCH_MESSAGE);
                    expect(interactableUpdateSpy).not.toHaveBeenCalled();
                });
                it('should dispatch the leave command to the game and call _emitAreaChanged', () => {
                    const { gameID } = gameArea.handleCommand({ type: 'JoinGame' }, player1);
                    if (!game) {
                        throw new Error('Game was not created by the first call to join');
                    }
                    expect(interactableUpdateSpy).toHaveBeenCalledTimes(1);
                    const leaveSpy = jest.spyOn(game, 'leave');
                    gameArea.handleCommand({ type: 'LeaveGame', gameID }, player1);
                    expect(leaveSpy).toHaveBeenCalledWith(player1);
                    expect(interactableUpdateSpy).toHaveBeenCalledTimes(2);
                });
                it('should not call _emitAreaChanged if the game throws an error', () => {
                    gameArea.handleCommand({ type: 'JoinGame' }, player1);
                    if (!game) {
                        throw new Error('Game was not created by the first call to join');
                    }
                    interactableUpdateSpy.mockClear();
                    const leaveSpy = jest.spyOn(game, 'leave').mockImplementationOnce(() => {
                        throw new Error('Test Error');
                    });
                    expect(() => gameArea.handleCommand({ type: 'LeaveGame', gameID: game.id }, player1)).toThrowError('Test Error');
                    expect(leaveSpy).toHaveBeenCalledWith(player1);
                    expect(interactableUpdateSpy).not.toHaveBeenCalled();
                });
                it('should update the history if the game is over', () => {
                    const { gameID } = gameArea.handleCommand({ type: 'JoinGame' }, player1);
                    gameArea.handleCommand({ type: 'JoinGame' }, player2);
                    interactableUpdateSpy.mockClear();
                    jest.spyOn(game, 'leave').mockImplementationOnce(() => {
                        game.endGame(player1.id);
                    });
                    gameArea.handleCommand({ type: 'LeaveGame', gameID }, player1);
                    expect(game.state.status).toEqual('OVER');
                    expect(gameArea.history.length).toEqual(1);
                    expect(gameArea.history[0]).toEqual({
                        gameID: game.id,
                        scores: {
                            [player1.userName]: 1,
                            [player2.userName]: 0,
                        },
                    });
                    expect(interactableUpdateSpy).toHaveBeenCalledTimes(1);
                });
            });
        });
        describe('[T3.4] when given an invalid command', () => {
            it('should throw an error', () => {
                expect(() => gameArea.handleCommand({ type: 'InvalidCommand' }, player1)).toThrowError(INVALID_COMMAND_MESSAGE);
                expect(interactableUpdateSpy).not.toHaveBeenCalled();
            });
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVGljVGFjVG9lR2FtZUFyZWEudGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3NyYy90b3duL2dhbWVzL1RpY1RhY1RvZUdhbWVBcmVhLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxRQUFRLENBQUM7QUFDaEMsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDekQsT0FBTyxFQUNMLHlCQUF5QixFQUN6Qiw0QkFBNEIsRUFDNUIsdUJBQXVCLEdBQ3hCLE1BQU0sa0NBQWtDLENBQUM7QUFRMUMsT0FBTyxpQkFBaUIsTUFBTSxxQkFBcUIsQ0FBQztBQUNwRCxPQUFPLEtBQUssbUJBQW1CLE1BQU0saUJBQWlCLENBQUM7QUFDdkQsT0FBTyxJQUFJLE1BQU0sUUFBUSxDQUFDO0FBRTFCLE1BQU0sV0FBWSxTQUFRLElBQXVDO0lBQy9EO1FBQ0UsS0FBSyxDQUFDO1lBQ0osS0FBSyxFQUFFLEVBQUU7WUFDVCxNQUFNLEVBQUUsa0JBQWtCO1NBQzNCLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFTSxTQUFTLEtBQVUsQ0FBQztJQUVwQixPQUFPLENBQUMsTUFBZTtRQUM1QixJQUFJLENBQUMsS0FBSyxHQUFHO1lBQ1gsR0FBRyxJQUFJLENBQUMsS0FBSztZQUNiLE1BQU0sRUFBRSxNQUFNO1lBQ2QsTUFBTTtTQUNQLENBQUM7SUFDSixDQUFDO0lBRVMsS0FBSyxDQUFDLE1BQWM7UUFDNUIsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDO1lBQ2pCLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxFQUFFLENBQUM7UUFDM0IsQ0FBQzthQUFNLENBQUM7WUFDTixJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxNQUFN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