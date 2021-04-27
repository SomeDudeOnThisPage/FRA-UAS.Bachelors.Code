import * as rules from './rules.js';
import * as utils from './utils.js';
import Board from './Board.js';
import Piece from "./Piece.js";

export function Game(root, peer, channel) {
  this.peer = peer;
  this.dataChannel = channel; // data channel to use for game data transfer

  this.started = false;
  this.paused = false;
  this.players = [];
  this.board = new Board(root);

  this.state = 'moved';

  this.gamestate = {
    fsm : 'starting',
    started : false,
    pieces : [],
    current : -1,
    lastRoll : -1,
    currentRolls : -1,
    canRollAgain : false
  }

  this.rng = null;              // seeded random number generator, initialized on game start
  this.localPlayerColor = null; // the color of the local player -> meaning the index of the local player in the player array

  // register event callbacks
  this.peer.on('make-move', (index, move) => this.onMakeMove(move, index));
  this.peer.on('generate-random', (number, index) => this.onRoll(number, index));
}

Game.prototype.seed = function(seed) {
  this.rng = new Math.seedrandom(seed);
}

Game.prototype.start = function(seed) {
  this.gamestate.started = true;
  this.seed(seed);
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
  this.gamestate.fsm = 'rolled';
  this.board.setDiePicture(roll);
  this.board.pulseDie(false);

  const player = this.players[this.gamestate.current];
  const pieces = this.gamestate.pieces[this.gamestate.current];

  this.gamestate.currentRolls++;
  this.moves = rules.generateMoves(roll, player, pieces);

  console.log(this.moves);

  this.gamestate.canRollAgain = rules.canRollAgain(roll, this.gamestate.currentRolls, player, pieces);

  if (this.moves.length === 0) {
    if (this.gamestate.canRollAgain) {
      this.moves = undefined;
      this.gamestate.fsm = 'moved';
      if (playing) {
        this.board.pulseDie(true);
        // utils.overlay(`You can roll again! You have ${3 - this.currentRolls} rolls remaining.`, () => );
      }
    } else {
      this.moves = undefined;
      this.gamestate.fsm = 'moved';
      this.nextPlayer(this.gamestate.current);
    }
  }
}

Game.prototype._postMakeMove = function(playing) {
  this.moves = undefined;

  if (this.gamestate.canRollAgain && playing) {
    //utils.overlay(`You threw a six, so you can roll again!`, () => this.roll());
    this.board.pulseDie(true);
    this.board.setDiePicture(0);
  } else {
    this.nextPlayer(this.gamestate.current);
  }
}

Game.prototype.roll = function() {
  const random = Math.floor(this.rng() * 6) + 1;
  this.peer.broadcast(this.dataChannel, 'generate-random', random, this.gamestate.current);
  this._postRoll(random, true);
}

Game.prototype.onRoll = function(roll, index) {
  if (!this.gamestate.started || index !== this.gamestate.current) return;

  if (roll !== Math.floor(this.rng() * 6) + 1) {
    alert('The number the player rolled does not match our own RNG. If you are the host, kick them! They are cheating!');
  }

  this._postRoll(roll, false);
}

Game.prototype.makeMove = function(player, move) {
  if (player.index === this.gamestate.current) {
    this.move(player, move);
    this.peer.broadcast(this.dataChannel, 'make-move', player.index, move);
    this._postMakeMove(true);
  }
}

Game.prototype.onMakeMove = function(move, index) {
  if (!this.gamestate.started || index !== this.gamestate.current) return;

  if (this.moves) {
    this.move(this.players[this.gamestate.current], move);
  }

  this._postMakeMove(false)
}

Game.prototype.nextPlayer = function(current) {
  if (rules.won(this.gamestate.pieces, ...this.players)) { // END GAME CONDITION: all players have won
    return this.end();
  }

  if (this.players[current]) {
    if (this.gamestate.canRollAgain) { // current player exists, and can roll again, don't increment current player
      this.gamestate.canRollAgain = false; // reset roll state
      this.gamestate.currentRolls = 0;
      return;
    }
  }

  // increment next player to the next possible player that exists and hasn't won yet
  let next = (current + 1) % 4;
  while (!this.players[next] || this.players[next].hasWon) {
    next = (next + 1) % 4;
  }

  // reset roll state
  this.gamestate.current = next;
  this.gamestate.canRollAgain = true;
  this.gamestate.currentRolls = 0;

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
    this.gamestate.pieces[player.index] = [];

    // add the players' four pieces to the gamestate
    for (let i = 1; i < 5; i++) {
      const piece = new Piece(i, -i, player);
      this.gamestate.pieces[player.index].push(piece);

      // also create the piece element!
      this.board.makePiece(player, this, i - 1, player.isLocalPlayer);
      this.board.put(piece, player);
    }
    console.log('GAMESTATE', this.gamestate);
  }
}

Game.prototype.removePlayer = function(color) {
  const player = this.players[color];
  if (!player) return;

  this.board.pieces[color].forEach((piece) => piece.remove());
  this.gamestate.pieces[color] = null;
  this.players[color] = null;

  if (color === this.gamestate.current) {
    this.nextPlayer(this.gamestate.current);
    this.gamestate.fsm = 'moved';
  }
}

/**
 * Applies - if possible - a given move to the current game state.
 * @param player
 * @param move
 */
Game.prototype.move = function(player, move) {
  if (this.gamestate.current !== player.index) return;
  if (this.gamestate.fsm !== 'rolled') return;

  // only allow 'valid' - i.e. moves that have been generated the same way by ourselves
  if (!this.moves.find((m) => m.from === move.from && m.to === move.to)) return;

  // reset local moves
  this.moves = null;

  const piece = this.gamestate.pieces[this.gamestate.current].find((piece) => piece.position === move.from);

  if (piece) {
    console.log('GAMESTATE', JSON.parse(JSON.stringify(this.gamestate)));

    // absolute index of the tile to move to, in range [0, 43]
    const toAbsolute = rules.getAbsoluteTilePosition(move.to, player);

    // when moving into a white field, we need to check if there's already a figure to beat
    for (const beatenPlayer of this.players) {
      if (beatenPlayer && beatenPlayer.index !== this.gamestate.current) { // only check other players
        const beaten = rules.findPieceOnAbsolutePosition(toAbsolute, beatenPlayer, this.gamestate.pieces[beatenPlayer.index]);

        if (beaten && beaten.position <= 39) { // move beaten piece back to a fields, beating in b fields is not possible
          beaten.position = -beaten.index;
          this.board.put(beaten, beatenPlayer);
        }
      }
    }

    // move the dom-element to the absolute tile index
    piece.position = move.to;
    this.board.put(piece, player); // move piece
  }

  if (rules.won(this.gamestate.pieces, player)) {
    player.hasWon = true;
    alert(`Woop Woop! Player ${player.name} has won!`);
  }
  this.gamestate.fsm = 'moved';
}

Game.prototype.render = function() {
  this.board.rootElement.empty();
  this.board.render();
  this.board.die.click(() => {
    if (this.gamestate.started && !this.paused && this.gamestate.current === this.localPlayerColor && this.gamestate.fsm === 'moved' || this.gamestate.fsm === 'starting') {
      this.roll();
    }
  });
}
