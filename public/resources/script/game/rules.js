import Move from './Move.js';

export const canRollAgain = (lastRoll, currentRolls, player, pieces) => {
  return lastRoll === 6 || (currentRolls < 3 && getPiecesInAFields(pieces).length === 4 - getPiecesInBFields(pieces).length)
}

export const getPlayerStartFieldIndex = (player) => {
  return player.index * 10;
}

export const getPiecesInAFields = (pieces) => {
  return pieces.filter((piece) => piece.position <= -1);
}

export const getPiecesInBFields = (pieces) => {
  return pieces.filter((piece) => piece.position > 39);
}

export const getRelativePiecePosition = (player, piece) => {
  return piece.position - getPlayerStartFieldIndex(player);
}

export const getAbsoluteTilePosition = (position, player) => {
  if (position >= 0 && position < 40) {
    return (position + getPlayerStartFieldIndex(player)) % 40;
  } else {
    return position;
  }
}

export const canMoveIntoField = (position, pieces) => {
  // position 43 is the maximum relative-to-start-point position of a piece
  // so we can move into a field if pos <= 43 and there is no figure of the same player there
  // this does NOT cover the no-skipping check in b-fields however!
  return !(pieces.find((piece) => piece.position === position) && position < 44);
}

export const currentPlayerActive = (game) => {
  return game.current === game.localPlayerColor;
}

// finds a piece at an absolute position of a player
export const findPieceOnAbsolutePosition = (position, player, pieces) => {
  const piece = pieces.find((piece) => {
    return getAbsoluteTilePosition(piece.position, player) === position;
  });
  if (piece) {
    return piece;
  }
}

export const won = (pieces, ...players) => {
  // a player has won when each of their pieces are in a b-field => i.e. their relative index is greater 39
  // check this condition for all players supplied as arguments
  return players.every((player) => player && pieces[player.index].every((piece) => piece.position > 39));
}

export const positionIsInBFields = (position) => {
  return position > 39 && position < 44;
}

export const positionIsInWhiteFields = (position) => {
  return position < 40 && position > 0;
}

export const pieceIsInAField = (piece) => {
  return piece.position < 0;
}

export const generateMoves = (dice, player, pieces) => {
  //const player = this.players.find((player) => player.index === playerIndex);
  const moves = []; // this arrays' move positions are RELATIVE to the players' start tile

  if (dice === 6) { // check if we have to move out of our a fields
    const piecesInAFields = getPiecesInAFields(pieces);
    console.log(piecesInAFields.length);
    // TODO: if a player owned piece is on their own start-field, force them to move from it if possible
    // This might need to be done recursively, to find the first possible move a figure can make, in case the
    // target field the figure on start must move to is obstructed
    if (piecesInAFields.length > 0 && canMoveIntoField(0, pieces)) {
      piecesInAFields.forEach((piece) => {    // we have to move out, only generate moves to move out pieces in a-fields
        moves.push(new Move(piece.position, 0));   // target tile is ALWAYS the players start field (relative coordinate 0)
      });
      return moves;
    }
  }

  pieces.forEach((piece) => { // if we did not roll a 6, or we cannot move out of the a-fields, generate other moves
    const target = piece.position + dice;

    // only generate a move if the piece is out of their a-field, and the figure can actually move there
    if (!pieceIsInAField(piece) && canMoveIntoField(target, pieces)) {
      if (positionIsInBFields(target)) {
        // if there is a different figure between FROM and TO, do not allow move
        const otherPiecesInBFields = getPiecesInBFields(pieces).filter((p) => p.id !== piece.id);
        if (!otherPiecesInBFields.find((p) => p.position < target && p.position > piece.position)) {
          moves.push(new Move(piece.position, target));
        }
      }

      if (positionIsInWhiteFields(target)) { // generate 'normal' move into white tile
        moves.push(new Move(piece.position, target));
      }
    }
  });

  return moves;
}
