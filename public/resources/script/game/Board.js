import {
  WHITE_TILE_LOCATIONS, A_TILE_LOCATIONS, B_TILE_LOCATIONS, LINE_LOCATIONS,
  ARROW_LOCATIONS, IMAGE_ARROW_PATH, DICE_POSITION, DICE_IMAGES, IMAGE_PLAYER_FIGURE_PATHS
} from './constants.js';
import * as rules from './rules.js';
import {getAbsoluteTilePosition} from "./rules.js";

const makeDie = (position) => {
  const die = $('<img alt="">')
    .css({
      'background-color' : 'transparent',
      'width' : `10%`,
      'height' : `10%`,
      'position' : 'absolute',
      'top' : `${position.top}`,
      'left' : `${position.left}`
    });

  die.attr('src', DICE_IMAGES[0]);
  return die;
}

const makeTile = (tileData) => {
  const tileContainer = $('<div>')
    .css({
      'background-color' : 'transparent',
      'width' : `10%`,
      'height' : `10%`,
      'border-radius' : '50%',
      'position' : 'absolute',
      'top' : `${tileData.x * 9}%`,
      'left' : `${tileData.y * (9)}%`
    });

  const transform = tileData.size ? (100 - tileData.size) / (1.5) : 10;
  const size = tileData.size ? tileData.size : 80;
  const tile = $('<div>')
    .addClass('tile-body')
    .css({
      'background-color' : (tileData.color) ? tileData.color : 'white',
      'border' : `2px solid black`,
      'width' : `${size}%`,
      'height' : `${size}%`,
      'border-radius' : '50%',
      'transform' : `translate(${transform}%, ${transform}%)` // vertical and horizontal center
    });

  if (tileData.id) {
    tileContainer.attr('id', tileData.id);
  }

  tileContainer.append(tile);

  return tileContainer;
}

const makeArrow = (arrowData) => {
  const div = $('<div>').css({
    'position' : 'absolute',
    'width' : `11%`,
    'top' : arrowData.top,
    'left' : arrowData.left,
    'transform' : arrowData.transform
  });
  div.append($('<img alt="arrow">').attr('src', IMAGE_ARROW_PATH));

  return div;
}

const Board = function(rootElement) {
  this.rootElement = rootElement;
  this.whiteTiles = [];
  this.aTiles = {
    0 : [], 1 : [], 2 : [], 3 : []
  };
  this.bTiles = {
    0 : [], 1 : [], 2 : [], 3 : []
  };
  this.pieces = {
    0 : [], 1 : [], 2 : [], 3 : []
  };
  this.die = null;
}


Board.prototype.makePiece = function(player, game, index, hasCallbacks) {
  const style = {
    'position'         : 'absolute',
    'background-color' : 'transparent',
    'left'             : '21%',
    'top'              : '-2%',
    'width'            : '60%'
  };

  const piece = $('<img alt="">')
    .css(style)
    .attr('src', IMAGE_PLAYER_FIGURE_PATHS[player.index]);

  if (hasCallbacks) {
    piece.on('mouseenter', () => {
      if (game.moves && game.gamestate.current === player.index) {
        const pieceData = game.gamestate.pieces[player.index][index];
        const move = game.moves.find((move) => move.from === pieceData.position);
        if (move) { // highlight absolute to
          game.board.highlight(move.to, player, true);
        }
      }
    });

    piece.on('mouseleave', () => {
      if (game.moves && game.gamestate.current === player.index) {
        const pieceData = game.gamestate.pieces[player.index][index];
        const move = game.moves.find((move) => move.from === pieceData.position);
        if (move) { // un-highlight absolute to
          game.board.highlight(move.to, player, false);
        }
      }
    });

    piece.click(() => {
      if (!game.moves || game.paused) { return; }
      // check if a move exists where this figure is on top of the src field
      const pieceData = game.gamestate.pieces[player.index][index];
      const move = game.moves.find((move) => move.from === pieceData.position);
      if (move) {
        if (game.moves && game.gamestate.current === player.index) {
          const move = game.moves.find((move) => move.from === pieceData.position);
          if (move) { // un-highlight absolute to
            game.board.highlight(move.to, player, false);
          }
        }

        game.makeMove(player, move);
      }
    });
  }

  this.pieces[player.index].push(piece);
}

Board.prototype.put = function(piece, player) {
  //console.log(piece, player);
  // position must be RELATIVE to the given player
  const element = this.pieces[player.index][piece.index - 1];
  if (piece.position < 0) {
    this.aTiles[player.index][piece.index - 1].append(element);
  } else if (piece.position < 40) {
    // move element onto white tile (convert relative to absolute position)
    //console.log(this.whiteTiles, this.whiteTiles[rules.getAbsoluteTilePosition(piece.position, player)], piece);
    this.whiteTiles[rules.getAbsoluteTilePosition(piece.position, player)].append(element);
  } else if (piece.position < 44) {
    this.bTiles[player.index][piece.position % 40].append(element);
  }
}

Board.prototype.pulseDie = function(pulse) {
  if (pulse) {
    this.die.addClass('pulsing');
  } else {
    this.die.removeClass('pulsing');
  }
}

Board.prototype.setDiePicture = function(roll) {
  this.die.attr('src', DICE_IMAGES[roll]);
}

Board.prototype.setDieRotate = function(rotate) {
  if (rotate) {
    this.die.addClass('rotating');
  } else {
    this.die.removeClass('rotating');
  }
}

Board.prototype.highlight = function(position, player, highlight) {
  if (position > 39 && position < 44) {
    this.bTiles[player.index][position % 40].find('.tile-body').css({'border' : highlight ? '2px solid yellow' : '2px solid black'});
  } else {
    this.whiteTiles[getAbsoluteTilePosition(position, player)].find('.tile-body').css({'border' : highlight ? '2px solid yellow' : '2px solid black'});
  }
}

Board.prototype.render = function() {
  // create 12 lines
  LINE_LOCATIONS.forEach((line) => {
    const div = $('<div>')
      .css({
        'border'   : '1px solid black',
        'width'    : line.width,
        'height'   : line.height,
        'position' : 'absolute',
        'top'      : line.top,
        'left'     : line.left
      });
    this.rootElement.append(div);
  });

  // create 40 main game tiles
  WHITE_TILE_LOCATIONS.forEach((location) => {
    const tile = makeTile(location);
    this.whiteTiles.push(tile);
    this.rootElement.append(tile);
  });

  // create a fields
  A_TILE_LOCATIONS.forEach((location, i) => {
    const af = makeTile(location);
    this.aTiles[Math.floor(i / 4)].push(af)
    this.rootElement.append(af);
  });

  // create a fields
  B_TILE_LOCATIONS.forEach((location, i) => {
    const bf = makeTile(location);
    this.bTiles[Math.floor(i / 4)].push(bf);
    this.rootElement.append(bf);
  });

  ARROW_LOCATIONS.forEach((arrowData) => {
    this.rootElement.append(makeArrow(arrowData));
  });

  this.die = makeDie(DICE_POSITION);
  this.rootElement.append(this.die);
}

export default Board;
