import {getAbsoluteTilePosition} from './rules.js';
import {PLAYER_COLORS, IMAGE_PLAYER_FIGURE_PATHS} from './constants.js';

Player.prototype.makeFigures = function(game) {
  const self = this;
  this.pieces.forEach((piece, i) => {
    if (piece.pos < 0) { // add to a fields
      piece.element = $('<img>').addClass(`f-${this.index}-${piece.id}`).css({
        'position' : 'absolute',
        'top' : '0%',
        'left' : '20%',
        'width' : '60%',
        //'height' : '100%',
        'background-color' : 'transparent'
      }).attr('src', IMAGE_PLAYER_FIGURE_PATHS[self.index]);

      // if the piece belongs to the local player, make it clickable
      if (this.isLocalPlayer) {
        piece.element.click(() => {
          if (!game.moves || game.current !== self.index) { return; }

          console.log(piece);
          // check if a move exists where this figure is on top of the src field
          const move = game.moves.find((move) => move.from === piece.pos);
          if (move) {
            console.log('SELDF', self);
            game.makeMove(self, move)
          }
        });
      }

      console.log(this.index, i);
      $(`#a${this.index}${i}`).append(piece.element);
      // game.board.aTiles[this.index][i].append(piece.element);
    }
  });
}

Player.prototype.removeFigures = function() {
  this.pieces.forEach((piece) => piece.element.remove());
}

Player.prototype.setPiecePositions = function(positions, game) {
  const self = this;
  this.pieces.forEach((piece, index) => {
    piece.pos = positions[self.index][index];
    if (piece.pos < 0) {
      game.board.aTiles[self.index][index].append(piece.element);
    } else {
      game.board.whiteTiles[getAbsoluteTilePosition(piece.pos, this)].append(piece.element);
    }
  });
}

export default function Player(index, name, isLocalPlayer) {
  console.log('player index for ' + name + ' is ' + index + ', local player is ' + isLocalPlayer);
  this.index = index; // index start fields : 0 - 0 (yellow), 1 - 10 (green), 2 - 20 (red), 3 - 30 (black)
  this.pieces = [{id : 0, pos : -1}, {id : 1, pos : -2}, {id : 2, pos : -3}, {id : 3, pos : -4}];
  this.name = name;
  this.hasWon = false;
  this.isLocalPlayer = isLocalPlayer;
}