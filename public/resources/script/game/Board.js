import {WHITE_TILE_LOCATIONS, A_TILE_LOCATIONS, B_TILE_LOCATIONS, LINE_LOCATIONS,
ARROW_LOCATIONS, IMAGE_ARROW_PATH} from './constants.js';

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

export default function Board(rootElement) {
  this.rootElement = rootElement;
  this.whiteTiles = [];
  this.aTiles = {
    0 : [], 1: [], 2 : [], 3 : []
  };
  this.bTiles = {
    0 : [], 1: [], 2 : [], 3 : []
  };
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
    this.aTiles[i % 4].push(af)
    this.rootElement.append(af);
  });

  // create a fields
  B_TILE_LOCATIONS.forEach((location, i) => {
    const bf = makeTile(location);
    this.bTiles[i % 4].push(bf);
    this.rootElement.append(bf);
  });

  ARROW_LOCATIONS.forEach((arrowData) => {
    this.rootElement.append(makeArrow(arrowData));
  });
}