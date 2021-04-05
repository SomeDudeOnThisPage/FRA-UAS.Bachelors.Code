import {
  getPiecesInAFields,
  getAbsoluteTilePosition,
  canMoveIntoField,
  currentPlayerActive,
  findPieceOnAbsolutePosition,
  hasPlayerWon, getPiecesInBFields
} from "./rules.js";
import Board from "./Board.js";

export function GameTest(root, peer, localPlayerId) {
  this.peer = peer;
  this.started = false;
  this.players = [];
  this.board = new Board(root);
  this.rng = undefined; // seeded random number generator, initialized on game start

  this.localPlayerId = undefined;
  this.state = 'moved';

  this.current = 0;
  this.currentRolls = 0;
  this.canRollAgain = false;

  this.peer.on('make-move', (index, move, src) => {
    if (!this.started) return;
    if (index === this.current) {
      this.applyMove(this.players.find((p) => p.index === index), move);
    }
  });

  this.peer.on('generate-random', (number, player) => {
    this.roll();
  });
}

GameTest.prototype.start = function(seed) {
  this.started = true;
  this.rng = new Math.seedrandom(seed);
  console.log(seed);
  $('#btn-generate-random-number').prop('disabled', false);
}

GameTest.prototype.end = function(endedByHost) {
  if (!endedByHost) {
    alert('The game has ended, all players\' figures are in their homes! GG!');
  } else {
    alert('The host was so upset that he ended the game manually. Good Job!');
  }
}

// generates an array of possible moves for a player with a given dice roll
GameTest.prototype.generateMoves = function(roll, playerIndex) {
  const player = this.players.find((player) => player.index === playerIndex);
  const moves = [];

  // check if we have to move out of our a fields
  if (roll === 6) {
    const piecesInAFields = getPiecesInAFields(player);
    if (piecesInAFields.length > 0 && canMoveIntoField(0, player)) {
      // we have to move out, only generate moves to move out pieces in a-fields
      piecesInAFields.forEach((piece) => {
        // target tile is ALWAYS the players start field (relative coordinate 0)
        moves.push({from : piece.pos, to : 0});
      });
      return moves;
    }
  }

  // if we did not roll a 6, or we cannot move out of the a-fields, generate other moves
  player.pieces.forEach((piece) => {
    if (piece.pos >= 0) {
      const target = piece.pos + roll;
      if (canMoveIntoField(target, player)) {
        if (target > 39) { // target greater 39 is b-fields
          if (target > 43) return; // max field is 43
          // if there is a different figure between FROM and TO, do not allow move
          const otherPiecesInBFields = getPiecesInBFields(player).filter((p) => p.id !== piece.id);
          if (!otherPiecesInBFields.find((p) => p.pos < target && p.pos > piece.pos)) {
            moves.push({from : piece.pos, to : target});
          }
        } else {
          moves.push({from : piece.pos, to : target});
        }
      }
    }
  });

  return moves;
}

GameTest.prototype.nextPlayer = function(current) {
  const currentPlayer = this.players.find((p) => p.index === current);
  const next = (current + 1) % 4; // step until we find a player

  if (this.players.every((player) => player.hasWon)) { // END GAME CONDITION: all players have won
    this.end();
  } else {


    if (this.canRollAgain) {
      console.log('canRollAgain', this.canRollAgain)
      $('#p-fair-number').text(`${currentPlayer.name} can roll again, because they rolled a six...`);
      this.canRollAgain = false;
      this.currentRolls = 0;
      return;
    }

    if (!this.players.find((p => p.index === next)) || this.players.find((p) => p.index === next).hasWon) {
      return this.nextPlayer(next);
    }

    this.current = next;
    this.currentRolls = 0;

    const nextPlayer = this.players.find((p) => p.index === next);
    $('#current-player').text(`${nextPlayer.name} is currently playing. (player${this.current})`);
    if (nextPlayer.index === this.localPlayerId) {
      $('#p-fair-number').text(`Throw the dice, decide your fate...`);
      console.log('your turn');
    } else {
      $('#p-fair-number').text(`${nextPlayer.name} has yet to throw the dice...`);
    }
  }
}

GameTest.prototype.addPlayer = function(player) {
  if (this.players.length < 4) {
    this.players.push(player);
  }

  player.makeFigures(this);
}

GameTest.prototype.removePlayer = function(index) {
  const player = this.players.find((player) => player.index === index);

  if (player.index === this.current) {
    this.nextPlayer(this.current);
  }

  if (player) {
    player.removeFigures();
    this.players = this.players.filter((player) => player.index !== index);
  }
}

GameTest.prototype.roll = function(rollLocal) {
  // only allow rolling by pressing the button when we are the currently playing player
  if (rollLocal && (!currentPlayerActive(this) || !this.started)) return;

  if (this.state === 'moved') {
    // generate our seeded random number
    const num = Math.floor(this.rng() * 6);

    if (rollLocal) {
      // tell all other peers to generate their seeded random, and generate associated moves
      this.peer.broadcast('generate-random', num, this.current);
    }

    //const num = Math.round(Math.random() * 6); // generate our random number
    //this.peer.broadcast('receive-random', num, this.current);

    $('#p-fair-number').text(`Dice: ${num + 1}`);
    this.moves = this.generateMoves(num + 1, this.current);
    this.state = 'rolled';

    if (num + 1 === 6) {
      this.canRollAgain = true;
    }

    if (this.moves.length === 0) {
      if (this.currentRolls < 2 && getPiecesInAFields(this.players.find((p) => p.index === this.current)).length === 4) { // all pieces in a fields
        this.state = 'moved';
        this.moves = undefined;
        this.currentRolls++;
        $('#p-fair-number').text(`Dice: ${num + 1} - You have ${3 - this.currentRolls} rolls remaining.`);
      } else {
        this.nextPlayer(this.current);
        this.moves = undefined;
        this.state = 'moved';
        this.currentRolls = 0;
        $('#p-fair-number').text(`Dice: ${num + 1} - You have no rolls remaining.`);
      }
    }
  }
}

GameTest.prototype.applyMove = function(player, move) {
  if (this.current !== player.index) return;
  if (this.state === 'rolled') {

    // only allow 'valid' - i.e. moves that have been generated the same way by ourselves
    if (!this.moves.find((m) => m.from === move.from && m.to === move.to)) return;

    this.moves = undefined;

    const piece = player.pieces.find((piece) => piece.pos === move.from);

    // absolute index of the tile to move to, in range [0, 39]
    const toAbsolute = getAbsoluteTilePosition(move.to, player);

    // when moving into a white field, we need to check if there's already a figure to beat
    for (const beatenPlayer of this.players) {
      if (beatenPlayer.index !== this.current) {
        const beaten = findPieceOnAbsolutePosition(toAbsolute, beatenPlayer);

        if (beaten && beaten.pos <= 39) { // move beaten piece back to a fields, beating in b fields is not possible
          beaten.pos = -beaten.id - 1;
          $(`#a${beatenPlayer.index}${beaten.id}`).append(beaten.element);
        }
      }
    }

    // move the dom-element to the absolute tile index
    if (piece) {
      piece.pos = move.to;

      if (piece.pos < 40) {
        this.board.whiteTiles[toAbsolute % 40].append(piece.element);
      } else {
        $(`#b${player.index}${piece.pos - 40}`).append(piece.element);
      }
    }

    if (hasPlayerWon(player)) {
      player.hasWon = true;
      alert(`Woop Woop! Player ${player.name} has won!`);
    }

    this.nextPlayer(this.current);
    this.state = 'moved';
  }
}

GameTest.prototype.makeMove = function(player, move) {
  console.log(player.index, this.current);
  if (player.index === this.current) {
    this.applyMove(player, move);
    this.peer.broadcast('make-move', player.index, move);
  }
}

GameTest.prototype.render = function() {
  this.board.rootElement.empty();
  this.board.render();
}