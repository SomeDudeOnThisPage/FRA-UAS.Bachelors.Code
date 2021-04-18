/**
 * A Moves' positions are always RELATIVE to the player making the move. The player making the move is derived from
 * the currently playing player.
 * @param from
 * @param to
 * @constructor
 */
const Move = function(from, to) {
  this.from = from;
  this.to = to;
}

export default Move;
