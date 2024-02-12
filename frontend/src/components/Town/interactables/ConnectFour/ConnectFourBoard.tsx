import { Button, chakra, Container } from '@chakra-ui/react';
import ConnectFourAreaController from '../../../../classes/interactable/ConnectFourAreaController';
import React from 'react';

export type ConnectFourGameProps = {
  gameAreaController: ConnectFourAreaController;
};
const StyledConnectFourBoard = chakra(Container, {
  baseStyle: {
    display: 'flex',
    width: '350px',
    height: '350px',
    padding: '5px',
    flexWrap: 'wrap',
  },
});
const StyledConnectFourSquare = chakra(Button, {
  baseStyle: {
    justifyContent: 'center',
    alignItems: 'center',
    flexBasis: '14%',
    border: '1px solid black',
    height: '14%',
    fontSize: '50px',
    _disabled: {
      opacity: '100%',
    },
  },
});
/**
 * A component that renders the ConnectFour board
 *
 * Renders the ConnectFour board as a "StyledConnectFourBoard", which consists of "StyledConnectFourSquare"s
 * (one for each cell in the board, starting from the top left and going left to right, top to bottom).
 *
 * Each StyledConnectFourSquare has an aria-label property that describes the cell's position in the board,
 * formatted as `Cell ${rowIndex},${colIndex} (Red|Yellow|Empty)`.
 *
 * The board is re-rendered whenever the board changes, and each cell is re-rendered whenever the value
 * of that cell changes.
 *
 * If the current player is in the game, then each StyledConnectFourSquare is clickable, and clicking
 * on it will make a move in that column. If there is an error making the move, then a toast will be
 * displayed with the error message as the description of the toast. If it is not the current player's
 * turn, then the StyledConnectFourSquare will be disabled.
 *
 * @param gameAreaController the controller for the ConnectFour game
 */
export default function ConnectFourBoard({
  gameAreaController,
}: ConnectFourGameProps): JSX.Element {
  return (
    <StyledConnectFourBoard aria-label='Connect Four Board'>
      Implement this to show the connect four board for the game area controller
      {gameAreaController}
      <StyledConnectFourSquare aria-label='Cell 0,0 (Empty)'>0,0</StyledConnectFourSquare>
    </StyledConnectFourBoard>
  );
}
