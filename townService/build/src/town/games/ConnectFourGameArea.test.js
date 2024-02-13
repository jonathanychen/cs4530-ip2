import { nanoid } from 'nanoid';
import { mock } from 'jest-mock-extended';
import ConnectFourGameArea from './ConnectFourGameArea';
import * as ConnectFourGameModule from './ConnectFourGame';
import Game from './Game';
import { createPlayerForTesting } from '../../TestUtils';
import { GAME_ID_MISSMATCH_MESSAGE, GAME_NOT_IN_PROGRESS_MESSAGE, INVALID_COMMAND_MESSAGE, } from '../../lib/InvalidParametersError';
class TestingGame extends Game {
    constructor(priorGame) {
        super({
            moves: [],
            status: 'WAITING_TO_START',
            firstPlayer: 'Red',
        });
    }
    applyMove(move) { }
    endGame(winner) {
        this.state = {
            ...this.state,
            status: 'OVER',
            winner,
        };
    }
    startGame(player) {
        if (this.state.red === player.id)
            this.state.redReady = true;
        else
            this.state.yellowReady = true;
    }
    _join(player) {
        if (this.state.red)
            this.state.yellow = player.id;
        else
            this.state.red = player.id;
        this._players.push(player);
    }
    _leave(player) { }
}
describe('ConnectFourGameArea', () => {
    let gameArea;
    let red;
    let yellow;
    let interactableUpdateSpy;
    const gameConstructorSpy = jest.spyOn(ConnectFourGameModule, 'default');
    let game;
    beforeEach(() => {
        gameConstructorSpy.mockClear();
        game = new TestingGame();
        gameConstructorSpy.mockReturnValue(game);
        red = createPlayerForTesting();
        yellow = createPlayerForTesting();
        gameArea = new ConnectFourGameArea(nanoid(), { x: 0, y: 0, width: 100, height: 100 }, mock());
        gameArea.add(red);
        game.join(red);
        gameArea.add(yellow);
        game.join(yellow);
        interactableUpdateSpy = jest.spyOn(gameArea, '_emitAreaChanged');
    });
    describe('[T3.1] JoinGame command', () => {
        test('when there is no existing game, it should create a new game and call _emitAreaChanged', () => {
            expect(gameArea.game).toBeUndefined();
            const { gameID } = gameArea.handleCommand({ type: 'JoinGame' }, red);
            expect(gameArea.game).toBeDefined();
            expect(gameID).toEqual(game.id);
            expect(interactableUpdateSpy).toHaveBeenCalled();
        });
        test('when there is a game that just ended, it should create a new game and call _emitAreaChanged', () => {
            expect(gameArea.game).toBeUndefined();
            gameConstructorSpy.mockClear();
            const { gameID } = gameArea.handleCommand({ type: 'JoinGame' }, red);
            expect(gameArea.game).toBeDefined();
            expect(gameID).toEqual(game.id);
            expect(interactableUpdateSpy).toHaveBeenCalled();
            expect(gameConstructorSpy).toHaveBeenCalledTimes(1);
            game.endGame();
            gameConstructorSpy.mockClear();
            const { gameID: newGameID } = gameArea.handleCommand({ type: 'JoinGame' }, red);
            expect(gameArea.game).toBeDefined();
            expect(newGameID).toEqual(game.id);
            expect(interactableUpdateSpy).toHaveBeenCalled();
            expect(gameConstructorSpy).toHaveBeenCalledTimes(1);
        });
        describe('when there is a game in progress', () => {
            it('should call join on the game and call _emitAreaChanged', () => {
                const { gameID } = gameArea.handleCommand({ type: 'JoinGame' }, red);
                if (!game) {
                    throw new Error('Game was not created by the first call to join');
                }
                expect(interactableUpdateSpy).toHaveBeenCalledTimes(1);
                const joinSpy = jest.spyOn(game, 'join');
                const gameID2 = gameArea.handleCommand({ type: 'JoinGame' }, yellow).gameID;
                expect(joinSpy).toHaveBeenCalledWith(yellow);
                expect(gameID).toEqual(gameID2);
                expect(interactableUpdateSpy).toHaveBeenCalledTimes(2);
            });
            it('should not call _emitAreaChanged if the game throws an error', () => {
                gameArea.handleCommand({ type: 'JoinGame' }, red);
                if (!game) {
                    throw new Error('Game was not created by the first call to join');
                }
                interactableUpdateSpy.mockClear();
                const joinSpy = jest.spyOn(game, 'join').mockImplementationOnce(() => {
                    throw new Error('Test Error');
                });
                expect(() => gameArea.handleCommand({ type: 'JoinGame' }, yellow)).toThrowError('Test Error');
                expect(joinSpy).toHaveBeenCalledWith(yellow);
                expect(interactableUpdateSpy).not.toHaveBeenCalled();
            });
        });
    });
    describe('[T3.2] StartGame command', () => {
        it('when there is no game, it should throw an error and not call _emitAreaChanged', () => {
            expect(() => gameArea.handleCommand({ type: 'StartGame', gameID: nanoid() }, red)).toThrowError(GAME_NOT_IN_PROGRESS_MESSAGE);
        });
        describe('when there is a game in progress', () => {
            it('should call startGame on the game and call _emitAreaChanged', () => {
                const { gameID } = gameArea.handleCommand({ type: 'JoinGame' }, red);
                interactableUpdateSpy.mockClear();
                gameArea.handleCommand({ type: 'StartGame', gameID }, yellow);
                expect(interactableUpdateSpy).toHaveBeenCalledTimes(1);
            });
            it('should not call _emitAreaChanged if the game throws an error', () => {
                gameArea.handleCommand({ type: 'JoinGame' }, red);
                if (!game) {
                    throw new Error('Game was not created by the first call to join');
                }
                interactableUpdateSpy.mockClear();
                const startSpy = jest.spyOn(game, 'startGame').mockImplementationOnce(() => {
                    throw new Error('Test Error');
                });
                expect(() => gameArea.handleCommand({ type: 'StartGame', gameID: game.id }, yellow)).toThrowError('Test Error');
                expect(startSpy).toHaveBeenCalledWith(yellow);
                expect(interactableUpdateSpy).not.toHaveBeenCalled();
            });
            test('when the game ID mismatches, it should throw an error and not call _emitAreaChanged', () => {
                gameArea.handleCommand({ type: 'JoinGame' }, red);
                if (!game) {
                    throw new Error('Game was not created by the first call to join');
                }
                expect(() => gameArea.handleCommand({ type: 'StartGame', gameID: nanoid() }, red)).toThrowError(GAME_ID_MISSMATCH_MESSAGE);
            });
        });
    });
    describe('[T3.3] GameMove command', () => {
        it('should throw an error if there is no game in progress and not call _emitAreaChanged', () => {
            interactableUpdateSpy.mockClear();
            expect(() => gameArea.handleCommand({ type: 'GameMove', move: { col: 0, row: 0, gamePiece: 'X' }, gameID: nanoid() }, red)).toThrowError(GAME_NOT_IN_PROGRESS_MESSAGE);
            expect(interactableUpdateSpy).not.toHaveBeenCalled();
        });
        describe('when there is a game in progress', () => {
            let gameID;
            beforeEach(() => {
                gameID = gameArea.handleCommand({ type: 'JoinGame' }, red).gameID;
                gameArea.handleCommand({ type: 'JoinGame' }, yellow);
                interactableUpdateSpy.mockClear();
            });
            it('should throw an error if the gameID does not match the game and not call _emitAreaChanged', () => {
                expect(() => gameArea.handleCommand({ type: 'GameMove', move: { col: 0, row: 0, gamePiece: 'Yellow' }, gameID: nanoid() }, red)).toThrowError(GAME_ID_MISSMATCH_MESSAGE);
            });
            it('should call applyMove on the game and call _emitAreaChanged', () => {
                const move = { col: 0, row: 0, gamePiece: 'Red' };
                const applyMoveSpy = jest.spyOn(game, 'applyMove');
                gameArea.handleCommand({ type: 'GameMove', move, gameID }, red);
                expect(applyMoveSpy).toHaveBeenCalledWith({
                    gameID: game.id,
                    playerID: red.id,
                    move: {
                        ...move,
                        gamePiece: 'Red',
                    },
                });
                expect(interactableUpdateSpy).toHaveBeenCalledTimes(1);
            });
            it('should not call _emitAreaChanged if the game throws an error', () => {
                const move = { col: 0, row: 0, gamePiece: 'Red' };
                const applyMoveSpy = jest.spyOn(game, 'applyMove');
                applyMoveSpy.mockImplementationOnce(() => {
                    throw new Error('Test Error');
                });
                expect(() => gameArea.handleCommand({ type: 'GameMove', move, gameID }, red)).toThrowError('Test Error');
                expect(applyMoveSpy).toHaveBeenCalledWith({
                    gameID: game.id,
                    playerID: red.id,
                    move: {
                        ...move,
                        gamePiece: 'Red',
                    },
                });
                expect(interactableUpdateSpy).not.toHaveBeenCalled();
            });
            describe('when the game ends', () => {
                test.each(['Red', 'Yellow'])('when the game is won by %p', (winner) => {
                    const finalMove = { col: 0, row: 0, gamePiece: 'Red' };
                    jest.spyOn(game, 'applyMove').mockImplementationOnce(() => {
                        game.endGame(winner === 'Red' ? red.id : yellow.id);
                    });
                    gameArea.handleCommand({ type: 'GameMove', move: finalMove, gameID }, red);
                    expect(game.state.status).toEqual('OVER');
                    expect(gameArea.history.length).toEqual(1);
                    const winningUsername = winner === 'Red' ? red.userName : yellow.userName;
                    const losingUsername = winner === 'Red' ? yellow.userName : red.userName;
                    expect(gameArea.history[0]).toEqual({
                        gameID: game.id,
                        scores: {
                            [winningUsername]: 1,
                            [losingUsername]: 0,
                        },
                    });
                    expect(interactableUpdateSpy).toHaveBeenCalledTimes(1);
                });
                test('when the game results in a tie', () => {
                    const finalMove = { col: 0, row: 0, gamePiece: 'Red' };
                    jest.spyOn(game, 'applyMove').mockImplementationOnce(() => {
                        game.endGame();
                    });
                    gameArea.handleCommand({ type: 'GameMove', move: finalMove, gameID }, red);
                    expect(game.state.status).toEqual('OVER');
                    expect(gameArea.history.length).toEqual(1);
                    expect(gameArea.history[0]).toEqual({
                        gameID: game.id,
                        scores: {
                            [red.userName]: 0,
                            [yellow.userName]: 0,
                        },
                    });
                    expect(interactableUpdateSpy).toHaveBeenCalledTimes(1);
                });
            });
        });
    });
    describe('[T3.4] LeaveGame command', () => {
        it('should throw an error if there is no game in progress and not call _emitAreaChanged', () => {
            expect(() => gameArea.handleCommand({ type: 'LeaveGame', gameID: nanoid() }, red)).toThrowError(GAME_NOT_IN_PROGRESS_MESSAGE);
            expect(interactableUpdateSpy).not.toHaveBeenCalled();
        });
        describe('when there is a game in progress', () => {
            it('should throw an error if the gameID does not match the game and not call _emitAreaChanged', () => {
                gameArea.handleCommand({ type: 'JoinGame' }, red);
                interactableUpdateSpy.mockClear();
                expect(() => gameArea.handleCommand({ type: 'LeaveGame', gameID: nanoid() }, red)).toThrowError(GAME_ID_MISSMATCH_MESSAGE);
                expect(interactableUpdateSpy).not.toHaveBeenCalled();
            });
            it('should call leave on the game and call _emitAreaChanged', () => {
                const { gameID } = gameArea.handleCommand({ type: 'JoinGame' }, red);
                if (!game) {
                    throw new Error('Game was not created by the first call to join');
                }
                expect(interactableUpdateSpy).toHaveBeenCalledTimes(1);
                const leaveSpy = jest.spyOn(game, 'leave');
                gameArea.handleCommand({ type: 'LeaveGame', gameID }, red);
                expect(leaveSpy).toHaveBeenCalledWith(red);
                expect(interactableUpdateSpy).toHaveBeenCalledTimes(2);
            });
            it('should not call _emitAreaChanged if the game throws an error', () => {
                gameArea.handleCommand({ type: 'JoinGame' }, red);
                if (!game) {
                    throw new Error('Game was not created by the first call to join');
                }
                interactableUpdateSpy.mockClear();
                const leaveSpy = jest.spyOn(game, 'leave').mockImplementationOnce(() => {
                    throw new Error('Test Error');
                });
                expect(() => gameArea.handleCommand({ type: 'LeaveGame', gameID: game.id }, red)).toThrowError('Test Error');
                expect(leaveSpy).toHaveBeenCalledWith(red);
                expect(interactableUpdateSpy).not.toHaveBeenCalled();
            });
            test.each(['Red', 'Yellow'])('when the game is won by %p, it updates the history', (playerThatWins) => {
                const leavingPlayer = playerThatWins === 'Red' ? yellow : red;
                const winningPlayer = playerThatWins === 'Red' ? red : yellow;
                const { gameID } = gameArea.handleCommand({ type: 'JoinGame' }, red);
                gameArea.handleCommand({ type: 'JoinGame' }, yellow);
                interactableUpdateSpy.mockClear();
                jest.spyOn(game, 'leave').mockImplementationOnce(() => {
                    game.endGame(winningPlayer.id);
                });
                gameArea.handleCommand({ type: 'LeaveGame', gameID }, leavingPlayer);
                expect(game.state.status).toEqual('OVER');
                expect(gameArea.history.length).toEqual(1);
                const winningUsername = winningPlayer.userName;
                const losingUsername = leavingPlayer.userName;
                expect(gameArea.history[0]).toEqual({
                    gameID: game.id,
                    scores: {
                        [winningUsername]: 1,
                        [losingUsername]: 0,
                    },
                });
                expect(interactableUpdateSpy).toHaveBeenCalledTimes(1);
            });
        });
    });
    test('[T3.5] When given an invalid command it should throw an error', () => {
        expect(() => gameArea.handleCommand({ type: 'InvalidCommand' }, red)).toThrowError(INVALID_COMMAND_MESSAGE);
        expect(interactableUpdateSpy).not.toHaveBeenCalled();
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQ29ubmVjdEZvdXJHYW1lQXJlYS50ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vc3JjL3Rvd24vZ2FtZXMvQ29ubmVjdEZvdXJHYW1lQXJlYS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxRQUFRLENBQUM7QUFDaEMsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBVzFDLE9BQU8sbUJBQW1CLE1BQU0sdUJBQXVCLENBQUM7QUFDeEQsT0FBTyxLQUFLLHFCQUFxQixNQUFNLG1CQUFtQixDQUFDO0FBQzNELE9BQU8sSUFBSSxNQUFNLFFBQVEsQ0FBQztBQUMxQixPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUN6RCxPQUFPLEVBQ0wseUJBQXlCLEVBQ3pCLDRCQUE0QixFQUM1Qix1QkFBdUIsR0FDeEIsTUFBTSxrQ0FBa0MsQ0FBQztBQUUxQyxNQUFNLFdBQVksU0FBUSxJQUEyQztJQUNuRSxZQUFtQixTQUEyQjtRQUM1QyxLQUFLLENBQUM7WUFDSixLQUFLLEVBQUUsRUFBRTtZQUNULE1BQU0sRUFBRSxrQkFBa0I7WUFDMUIsV0FBVyxFQUFFLEtBQUs7U0FDbkIsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVNLFNBQVMsQ0FBQyxJQUErQixJQUFTLENBQUM7SUFFbkQsT0FBTyxDQUFDLE1BQWU7UUFDNUIsSUFBSSxDQUFDLEtBQUssR0FBRztZQUNYLEdBQUcsSUFBSSxDQUFDLEtBQUs7WUFDYixNQUFNLEVBQUUsTUFBTTtZQUNkLE1BQU07U0FDUCxDQUFDO0lBQ0osQ0FBQztJQUVNLFNBQVMsQ0FBQyxNQUFjO1FBQzdCLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLEtBQUssTUFBTSxDQUFDLEVBQUU7WUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUM7O1lBQ3hELElBQUks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