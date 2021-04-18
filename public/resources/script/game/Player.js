import {PLAYER_COLORS, IMAGE_PLAYER_FIGURE_PATHS} from './constants.js';

const Player = function(index, name, isLocalPlayer) {
  console.log('player index for ' + name + ' is ' + index + ', local player is ' + isLocalPlayer);
  this.index = index; // index start fields : 0 - 0 (yellow), 1 - 10 (green), 2 - 20 (red), 3 - 30 (black)
  this.pieces = []; // {id : 0, pos : -1}, {id : 1, pos : -2}, {id : 2, pos : -3}, {id : 3, pos : -4}
  this.name = name;
  this.hasWon = false;
  this.isLocalPlayer = isLocalPlayer;
}

Player.prototype.addPiece = function(piece) {
  this.pieces.push(piece);
}

Player.prototype.removePieces = function() {
  this.pieces.forEach((piece) => piece.element.remove());
}

export default Player;