import InvalidParametersError, { BOARD_POSITION_NOT_VALID_MESSAGE, GAME_FULL_MESSAGE, GAME_NOT_IN_PROGRESS_MESSAGE, GAME_NOT_STARTABLE_MESSAGE, MOVE_NOT_YOUR_TURN_MESSAGE, PLAYER_ALREADY_IN_GAME_MESSAGE, PLAYER_NOT_IN_GAME_MESSAGE, } from '../../lib/InvalidParametersError';
import Game from './Game';
function getOtherPlayerColor(color) {
    if (color === 'Yellow') {
        return 'Red';
    }
    return 'Yellow';
}
export default class ConnectFourGame extends Game {
    _preferredRed;
    _preferredYellow;
    constructor(priorGame) {
        super({
            moves: [],
            status: 'WAITING_FOR_PLAYERS',
            firstPlayer: getOtherPlayerColor(priorGame?.state.firstPlayer || 'Yellow'),
        });
        this._preferredRed = priorGame?.state.red;
        this._preferredYellow = priorGame?.state.yellow;
    }
    startGame(player) {
        if (this.state.status !== 'WAITING_TO_START') {
            throw new InvalidParametersError(GAME_NOT_STARTABLE_MESSAGE);
        }
        if (this.state.red !== player.id && this.state.yellow !== player.id) {
            throw new InvalidParametersError(PLAYER_NOT_IN_GAME_MESSAGE);
        }
        if (this.state.red === player.id) {
            this.state.redReady = true;
        }
        if (this.state.yellow === player.id) {
            this.state.yellowReady = true;
        }
        if (!(this._preferredRed === this.state.red || this._preferredYellow === this.state.yellow)) {
            this.state.firstPlayer = 'Red';
        }
        this.state = {
            ...this.state,
            status: this.state.redReady && this.state.yellowReady ? 'IN_PROGRESS' : 'WAITING_TO_START',
        };
    }
    _join(player) {
        if (this.state.yellow === player.id || this.state.red === player.id) {
            throw new InvalidParametersError(PLAYER_ALREADY_IN_GAME_MESSAGE);
        }
        if (this._preferredRed === player.id && !this.state.red) {
            this.state = {
                ...this.state,
                status: 'WAITING_FOR_PLAYERS',
                red: player.id,
            };
        }
        else if (this._preferredYellow === player.id && !this.state.yellow) {
            this.state = {
                ...this.state,
                status: 'WAITING_FOR_PLAYERS',
                yellow: player.id,
            };
        }
        else if (!this.state.red) {
            this.state = {
                ...this.state,
                status: 'WAITING_FOR_PLAYERS',
                red: player.id,
            };
        }
        else if (!this.state.yellow) {
            this.state = {
                ...this.state,
                status: 'WAITING_FOR_PLAYERS',
                yellow: player.id,
            };
        }
        else {
            throw new InvalidParametersError(GAME_FULL_MESSAGE);
        }
        if (this.state.red && this.state.yellow) {
            this.state.status = 'WAITING_TO_START';
        }
    }
    _leave(player) {
        if (this.state.status === 'OVER') {
            return;
        }
        const removePlayer = (playerID) => {
            if (this.state.red === playerID) {
                this.state = {
                    ...this.state,
                    red: undefined,
                    redReady: false,
                };
                return 'Red';
            }
            if (this.state.yellow === playerID) {
                this.state = {
                    ...this.state,
                    yellow: undefined,
                    yellowReady: false,
                };
                return 'Yellow';
            }
            throw new InvalidParametersError(PLAYER_NOT_IN_GAME_MESSAGE);
        };
        const color = removePlayer(player.id);
        switch (this.state.status) {
            case 'WAITING_TO_START':
            case 'WAITING_FOR_PLAYERS':
                this.state.status = 'WAITING_FOR_PLAYERS';
                break;
            case 'IN_PROGRESS':
                this.state = {
                    ...this.state,
                    status: 'OVER',
                    winner: color === 'Red' ? this.state.yellow : this.state.red,
                };
                break;
            default:
                throw new Error(`Unexpected game status: ${this.state.status}`);
        }
    }
    _validateMove(move) {
        let nextPlayer;
        if (this.state.firstPlayer === 'Red') {
            nextPlayer = this.state.moves.length % 2 === 0 ? 'Red' : 'Yellow';
        }
        else {
            nextPlayer = this.state.moves.length % 2 === 0 ? 'Yellow' : 'Red';
        }
        if (move.gamePiece !== nextPlayer) {
            throw new InvalidParametersError(MOVE_NOT_YOUR_TURN_MESSAGE);
        }
        const numMovesInCol = this.state.moves.filter(m => m.col === move.col).length;
        if (numMovesInCol === 6) {
            throw new InvalidParametersError(BOARD_POSITION_NOT_VALID_MESSAGE);
        }
        if (move.row !== 5 - numMovesInCol) {
            throw new InvalidParametersError(BOARD_POSITION_NOT_VALID_MESSAGE);
        }
    }
    _applyMove(move) {
        const checkForTie = (moves) => moves.length === 42;
        const checkForWin = (moves) => {
            const board = new Array(6);
            for (let i = 0; i < board.length; i += 1) {
                board[i] = new Array(7).fill(undefined);
            }
            for (const eachMove of moves) {
                board[eachMove.row][eachMove.col] = eachMove.gamePiece;
            }
            for (let row = 0; row < board.length; row += 1) {
                let numInARow = 1;
                for (let col = 1; col < board[row].length; col += 1) {
                    if (board[row][col] && board[row][col] === board[row][col - 1]) {
                        numInARow += 1;
                    }
                    else {
                        numInARow = 1;
                    }
                    if (numInARow === 4) {
                        return true;
                    }
                }
            }
            for (let col = 0; col < board[0].length; col += 1) {
                let numInARow = 1;
                for (let row = 1; row < board.length; row += 1) {
                    if (board[row][col] && board[row][col] === board[row - 1][col]) {
                        numInARow += 1;
                    }
                    else {
                        numInARow = 1;
                    }
                    if (numInARow === 4) {
                        return true;
                    }
                }
            }
            for (let row = 0; row < board.length; row += 1) {
                for (let col = 0; col < board[row].length; col += 1) {
                    if (row + 3 < board.length &&
                        col + 3 < board[row].length &&
                        board[row][col] &&
                        board[row][col] === board[row + 1][col + 1] &&
                        board[row][col] === board[row + 2][col + 2] &&
                        board[row][col] === board[row + 3][col + 3]) {
                        return true;
                    }
                }
            }
            for (let row = 0; row < board.length; row += 1) {
                for (let col = 0; col < board[row].length; col += 1) {
                    if (row + 3 < board.length &&
                        col - 3 >= 0 &&
                        board[row][col] &&
                        board[row][col] === board[row + 1][col - 1] &&
                        board[row][col] === board[row + 2][col - 2] &&
                        board[row][col] === board[row + 3][col - 3]) {
                        return true;
                    }
                }
            }
            return false;
        };
        const newMoves = [...this.state.moves, move];
        const newState = {
            ...this.state,
            moves: newMoves,
        };
        if (checkForWin(newMoves)) {
            newState.status = 'OVER';
            newState.winner = move.gamePiece === 'Red' ? this.state.red : this.state.yellow;
        }
        else if (checkForTie(newMoves)) {
            newState.winner = undefined;
            newState.status = 'OVER';
        }
        this.state = newState;
    }
    applyMove(move) {
        if (this.state.status !== 'IN_PROGRESS') {
            throw new InvalidParametersError(GAME_NOT_IN_PROGRESS_MESSAGE);
        }
        let gamePiece;
        if (move.playerID === this.state.red) {
            gamePiece = 'Red';
        }
        else if (move.playerID === this.state.yellow) {
            gamePiece = 'Yellow';
        }
        else {
            throw new InvalidParametersError(PLAYER_NOT_IN_GAME_MESSAGE);
        }
        const newMove = {
            gamePiece,
            col: move.move.col,
            row: move.move.row,
        };
        this._validateMove(newMove);
        this._applyMove(newMove);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQ29ubmVjdEZvdXJHYW1lLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vc3JjL3Rvd24vZ2FtZXMvQ29ubmVjdEZvdXJHYW1lLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sc0JBQXNCLEVBQUUsRUFDN0IsZ0NBQWdDLEVBQ2hDLGlCQUFpQixFQUNqQiw0QkFBNEIsRUFDNUIsMEJBQTBCLEVBQzFCLDBCQUEwQixFQUMxQiw4QkFBOEIsRUFDOUIsMEJBQTBCLEdBQzNCLE1BQU0sa0NBQWtDLENBQUM7QUFTMUMsT0FBTyxJQUFJLE1BQU0sUUFBUSxDQUFDO0FBRTFCLFNBQVMsbUJBQW1CLENBQUMsS0FBdUI7SUFDbEQsSUFBSSxLQUFLLEtBQUssUUFBUSxFQUFFLENBQUM7UUFDdkIsT0FBTyxLQUFLLENBQUM7SUFDZixDQUFDO0lBQ0QsT0FBTyxRQUFRLENBQUM7QUFDbEIsQ0FBQztBQU1ELE1BQU0sQ0FBQyxPQUFPLE9BQU8sZUFBZ0IsU0FBUSxJQUEyQztJQUM5RSxhQUFhLENBQVk7SUFFekIsZ0JBQWdCLENBQVk7SUFTcEMsWUFBbUIsU0FBMkI7UUFDNUMsS0FBSyxDQUFDO1lBQ0osS0FBSyxFQUFFLEVBQUU7WUFDVCxNQUFNLEVBQUUscUJBQXFCO1lBQzdCLFdBQVcsRUFBRSxtQkFBbUIsQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLFdBQVcsSUFBSSxRQUFRLENBQUM7U0FDM0UsQ0FBQyxDQUFDO1FBQ0gsSUFBSSxDQUFDLGFBQWEsR0FBRyxTQUFTLEVBQUUsS0FBSyxDQUFDLEdBQUcsQ0FBQztRQUMxQyxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsU0FBUyxFQUFFLEtBQUssQ0FBQyxNQUFNLENBQUM7SUFDbEQsQ0FBQztJQW1CTSxTQUFTLENBQUMsTUFBYztRQUM3QixJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxLQUFLLGtCQUFrQixFQUFFLENBQUM7WUFDN0MsTUFBTSxJQUFJLHNCQUFzQixDQUFD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