import {IMAGE_PLAYER_FIGURE_PATHS} from './constants.js';
import {getAbsoluteTilePosition} from './rules.js';

const style = {
  'position'         : 'absolute',
  'background-color' : 'transparent',
  'left'             : '21%',
  'top'              : '-2%',
  'width'            : '60%'
};

const Piece = function(index, position, player) {
  this.index = index;
  this.position = position;
  this.element = $('<img alt="">')
    .css(style)
    .attr('src', IMAGE_PLAYER_FIGURE_PATHS[player.index]);
}

// because clicking on the pieces is LITERALLY the way to control the game, this violates the MVC principle
// but I guess this is the case for literally every game ever made
Piece.prototype.addElementCallback = function(game, player) {
  const self = this;
  this.element.on('mouseenter', () => {
    if (game.moves && game.current === player.index) {
      const move = game.moves.find((move) => move.from === self.position);
      if (move) { // highlight absolute to
        game.board.highlight(move.to, player, true);
      }
    }
  });

  this.element.on('mouseleave', () => {
    if (game.moves && game.current === player.index) {
      const move = game.moves.find((move) => move.from === self.position);
      if (move) { // un-highlight absolute to
        game.board.highlight(move.to, player, false);
      }
    }
  });

  this.element.click(() => {
    if (!game.moves || game.paused) { return; }
    // check if a move exists where this figure is on top of the src field
    const move = game.moves.find((move) => move.from === this.position);
    console.log(move, this.position, game.moves);
    if (move) {
      if (game.moves && game.current === player.index) {
        const move = game.moves.find((move) => move.from === self.position);
        if (move) { // un-highlight absolute to
          game.board.highlight(move.to, player, false);
        }
      }

      game.makeMove(player, move)
    }
  });
}

export default Piece;
