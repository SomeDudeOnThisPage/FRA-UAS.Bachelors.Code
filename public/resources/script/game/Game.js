import * as rules from './rules.js';
import * as utils from './utils.js';
import Board from './Board.js';
import Piece from "./Piece.js";

export function Game(root, peer, channel) {
  this.peer = peer;
  this.dataChannel = channel; // data channel to use for game data transfer

  this.started = false;
  this.players = [];
  this.board = new Board(root);

  this.state = 'moved';

  this.current = 0;           // index of the currently playing player
  this.currentRolls = 0;      // amount of rolls of the currently playing player
  this.canRollAgain = false;  // whether the current player can roll again (roll 6 or < 3 when all figures are in A-Field)

  this.rng = null;              // seeded random number generator, initialized on game start
  this.localPlayerColor = null; // the color of the local player -> meaning the index of the local player in the player array

  // register event callbacks
  this.peer.on('make-move', (index, move) => this.onMakeMove(move, index));
  this.peer.on('generate-random', (number, index) => this.onRoll(number, index));
}

Game.prototype.start = function(seed) {
  this.started = true;
  this.rng = new Math.seedrandom(seed);
  $('#btn-generate-random-number').prop('disabled', false);

  this.nextPlayer(-1);
}

Game.prototype.end = function(endedByHost) {
  if (!endedByHost) {
    alert('The game has ended, all players\' figures are in their homes! GG!');
  } else {
    alert('The host was so upset that he ended the game manually. Good Job!');
  }
}

Game.prototype._postRoll = function(roll, playing) {
  this.state = 'rolled';
  this.board.setDiePicture(roll);
  this.board.pulseDie(false);

  const player = this.players[this.current];
  this.currentRolls++;
  this.moves = rules.generateMoves(roll, player);

  this.canRollAgain = rules.canRollAgain(roll, this.currentRolls, player);

  if (this.moves.length === 0) {
    if (this.canRollAgain) {
      this.moves = undefined;
      this.state = 'moved';
      if (playing) {
        this.board.pulseDie(true);
        // utils.overlay(`You can roll again! You have ${3 - this.currentRolls} rolls remaining.`, () => );
      }
    } else {
      this.moves = undefined;
      this.state = 'moved';
      this.nextPlayer(this.current);
    }
  }
}

Game.prototype._postMakeMove = function(playing) {
  this.moves = undefined;

  if (this.canRollAgain && playing) {
    //utils.overlay(`You threw a six, so you can roll again!`, () => this.roll());
    this.board.pulseDie(true);
    this.board.setDiePicture(0);
  } else {
    this.nextPlayer(this.current);
  }
}

Game.prototype.roll = function() {
  const random = Math.floor(this.rng() * 6) + 1;
  this.peer.broadcast(this.dataChannel, 'generate-random', random, this.current);
  this._postRoll(random, true);
}

Game.prototype.onRoll = function(roll, index) {
  if (!this.started || index !== this.current) return;

  if (roll !== Math.floor(this.rng() * 6) + 1) {
    alert('The number the player rolled does not match our own RNG. If you are the host, kick them! They are cheating!');
  }

  this._postRoll(roll, false);
}

Game.prototype.makeMove = function(player, move) {
  if (player.index === this.current) {
    this.move(player, move);
    this.peer.broadcast(this.dataChannel, 'make-move', player.index, move);
    this._postMakeMove(true);
  }
}

Game.prototype.onMakeMove = function(move, index) {
  if (!this.started || index !== this.current) return;

  if (this.moves) {
    this.move(this.players[this.current], move);
  }

  this._postMakeMove(false)
}

Game.prototype.nextPlayer = function(current) {
  if (rules.won(...this.players)) { // END GAME CONDITION: all players have won
    return this.end();
  }

  if (this.players[current]) {
    if (this.canRollAgain) { // current player exists, and can roll again, don't increment current player
      this.canRollAgain = false; // reset roll state
      this.currentRolls = 0;
      return;
    }
  }

  // increment next player to the next possible player that exists and hasn't won yet
  let next = (current + 1) % 4;
  while (!this.players[next] || this.players[next].hasWon) {
    next = (next + 1) % 4;
  }

  // reset roll state
  this.current = next;
  this.canRollAgain = true;
  this.currentRolls = 0;

  // little notification for the player that is playing now, based on feedback from friends
  if (this.players[next].index === this.localPlayerColor) {
    this.board.pulseDie(true);
    utils.overlay('Your Turn!', () => {});
    this.board.setDiePicture(0); // reset die picture for new player
  }
}

Game.prototype.addPlayer = function(player) {
  if (player.index < 4 && !this.players[player.index]) {
    this.players[player.index] = player;

    // add our four pieces to the player (piece indices start at 1 to correspond to -1 * index element of [1, 4])
    for (let i = 1; i < 5; i++) {
      const piece = new Piece(i, -i, player);
      player.addPiece(piece);

      if (player.isLocalPlayer) {
        piece.addElementCallback(this, player);
      }

      this.board.put(piece, player);
    }
  }
}

Game.prototype.removePlayer = function(color) {
  const player = this.players[color];
  if (player) {
    player.removePieces();
    this.players[color] = null;
    if (color === this.current) {
      this.nextPlayer(this.current);
      this.state = 'moved';
    }
  }
}

/**
 * Applies - if possible - a given move to the current game state.
 * @param player
 * @param move
 */
Game.prototype.move = function(player, move) {
  console.log(this.current === player.index, this.state === 'rolled', this.moves, move);

  if (this.current !== player.index) return;
  if (this.state !== 'rolled') return;

  // only allow 'valid' - i.e. moves that have been generated the same way by ourselves
  if (!this.moves.find((m) => m.from === move.from && m.to === move.to)) return;

  // reset local moves
  this.moves = null;

  const piece = player.pieces.find((piece) => piece.position === move.from);

  if (piece) {
    // absolute index of the tile to move to, in range [0, 43]
    const toAbsolute = rules.getAbsoluteTilePosition(move.to, player);

    // when moving into a white field, we need to check if there's already a figure to beat
    for (const beatenPlayer of this.players) {
      if (beatenPlayer && beatenPlayer.index !== this.current) { // only check other players
        const beaten = rules.findPieceOnAbsolutePosition(toAbsolute, beatenPlayer);

        if (beaten && beaten.position <= 39) { // move beaten piece back to a fields, beating in b fields is not possible
          beaten.position = -beaten.index;
          this.board.put(beaten, beatenPlayer);
          //$(`#a${beatenPlayer.index}${beaten.index - 1}`).append(beaten.element);
        }
      }
    }

    // move the dom-element to the absolute tile index
    piece.position = move.to;
    this.board.put(piece, player); // move piece
  }

  if (rules.won(player)) {
    player.hasWon = true;
    alert(`Woop Woop! Player ${player.name} has won!`);
  }
  this.state = 'moved';
}

Game.prototype.render = function() {
  this.board.rootElement.empty();
  this.board.render();
  this.board.die.click(() => {
    if (this.started && this.current === this.localPlayerColor && this.state === 'moved') {
      this.roll();
    }
  });
}
