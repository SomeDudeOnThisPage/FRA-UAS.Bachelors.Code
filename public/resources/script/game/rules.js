export const getPlayerStartFieldIndex = (player) => {
  return player.index * 10;
}

export const getPiecesInAFields = (player) => {
  return player.pieces.filter((piece) => piece.pos <= -1);
}

export const getPiecesInBFields = (player) => {
  return player.pieces.filter((piece) => piece.pos > 39);
}

export const getRelativePiecePosition = (player, piece) => {
  return piece.pos - getPlayerStartFieldIndex(player);
}

export const getAbsoluteTilePosition = (position, player) => {
  if (position >= 0 && position < 40) {
    return (position + getPlayerStartFieldIndex(player)) % 40;
  } else {
    return position;
  }
}

export const canMoveIntoField = (target, player) => {
  return !player.pieces.find((piece) => piece.pos === target);
}

export const currentPlayerActive = (game) => {
  return game.current === game.localPlayerId;
}

// returns the index of the first free a field of a player
export const getFirstFreeAField = (player) => {
  for (let i = -1; i > -4; i--) {
    if (!player.pieces.find((piece) => piece.pos === i)) {
      return [Math.abs(i), player];
    }
  }
}

// finds a piece at an absolute position of a player
export const findPieceOnAbsolutePosition = (position, player) => {
  player.pieces.forEach((piece) => {
    console.log(position, getAbsoluteTilePosition(piece.pos, player));
  });
  const piece = Object.values(player.pieces).find((piece) => {
    return getAbsoluteTilePosition(piece.pos, player) === position;
  });
  if (piece) {
    return piece;
  }
}

export const hasPlayerWon = (player) => {
  // a player has won when each of their pieces are in a b-field => i.e. their relative index is greater 39
  return player.pieces.every((piece) => piece.pos > 39);
}