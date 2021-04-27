import {IMAGE_PLAYER_FIGURE_PATHS} from './constants.js';



const Piece = function(index, position, player) {
  this.index = index;
  this.position = position;
}

// because clicking on the pieces is LITERALLY the way to control the game, this violates the MVC principle
// but I guess this is the case for literally every game ever made
Piece.prototype.addElementCallback = function(game, player) {

}

export default Piece;
