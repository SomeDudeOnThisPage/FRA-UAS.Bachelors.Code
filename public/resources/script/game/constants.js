export const PLAYER_COLORS = [
  'yellow', 'green', 'red', '#1a1a1a' // default 'darkgray' is ugly
];

export const IMAGE_PLAYER_FIGURE_PATHS = [
  '/resources/img/YELLOW_SMALL.png',
  '/resources/img/GREEN_SMALL.png',
  '/resources/img/RED_SMALL.png',
  '/resources/img/BLACK_SMALL.png',
]

export const WHITE_TILE_LOCATIONS = [
  {x : 4, y : 0, color : PLAYER_COLORS[0]},
  {x : 4, y : 1},
  {x : 4, y : 2},
  {x : 4, y : 3},
  {x : 4, y : 4},

  {x : 3, y : 4},
  {x : 2, y : 4},
  {x : 1, y : 4},
  {x : 0, y : 4},
  {x : 0, y : 5},

  {x : 0, y : 6, color : PLAYER_COLORS[1]},
  {x : 1, y : 6},
  {x : 2, y : 6},
  {x : 3, y : 6},
  {x : 4, y : 6},

  {x : 4, y : 7},
  {x : 4, y : 8},
  {x : 4, y : 9},
  {x : 4, y : 10},
  {x : 5, y : 10},

  {x : 6, y : 10, color : PLAYER_COLORS[2]},
  {x : 6, y : 9},
  {x : 6, y : 8},
  {x : 6, y : 7},
  {x : 6, y : 6},

  {x : 7, y : 6},
  {x : 8, y : 6},
  {x : 9, y : 6},
  {x : 10, y : 6},
  {x : 10, y : 5},

  {x : 10, y : 4, color : PLAYER_COLORS[3]},
  {x : 9, y : 4},
  {x : 8, y : 4},
  {x : 7, y : 4},
  {x : 6, y : 4},

  {x : 6, y : 3},
  {x : 6, y : 2},
  {x : 6, y : 1},
  {x : 6, y : 0},
  {x : 5, y : 0},
];

export const A_TILE_LOCATIONS = [
  {x : 0, y : 0, color : PLAYER_COLORS[0], id : 'a00', size : 70},
  {x : 1, y : 0, color : PLAYER_COLORS[0], id : 'a01', size : 70},
  {x : 0, y : 1, color : PLAYER_COLORS[0], id : 'a02', size : 70},
  {x : 1, y : 1, color : PLAYER_COLORS[0], id : 'a03', size : 70},

  {x : 0, y : 9, color :  PLAYER_COLORS[1], id : 'a10', size : 70},
  {x : 0, y : 10, color : PLAYER_COLORS[1], id : 'a11', size : 70},
  {x : 1, y : 9, color :  PLAYER_COLORS[1], id : 'a12', size : 70},
  {x : 1, y : 10, color : PLAYER_COLORS[1], id : 'a13', size : 70},

  {x : 9, y : 9, color :   PLAYER_COLORS[2], id : 'a20', size : 70},
  {x : 10, y : 9, color :  PLAYER_COLORS[2], id : 'a21', size : 70},
  {x : 9, y : 10, color :  PLAYER_COLORS[2], id : 'a22', size : 70},
  {x : 10, y : 10, color : PLAYER_COLORS[2], id : 'a23', size : 70},

  {x : 9, y : 0, color :  PLAYER_COLORS[3], id : 'a30', size : 70},
  {x : 10, y : 0, color : PLAYER_COLORS[3], id : 'a31', size : 70},
  {x : 9, y : 1, color :  PLAYER_COLORS[3], id : 'a32', size : 70},
  {x : 10, y : 1, color : PLAYER_COLORS[3], id : 'a33', size : 70}
];

export const B_TILE_LOCATIONS = [
  {x : 5, y : 1, color : PLAYER_COLORS[0], id : 'b00', size : 70},
  {x : 5, y : 2, color : PLAYER_COLORS[0], id : 'b01', size : 70},
  {x : 5, y : 3, color : PLAYER_COLORS[0], id : 'b02', size : 70},
  {x : 5, y : 4, color : PLAYER_COLORS[0], id : 'b03', size : 70},

  {x : 1, y : 5, color : PLAYER_COLORS[1], id : 'b10', size : 70},
  {x : 2, y : 5, color : PLAYER_COLORS[1], id : 'b11', size : 70},
  {x : 3, y : 5, color : PLAYER_COLORS[1], id : 'b12', size : 70},
  {x : 4, y : 5, color : PLAYER_COLORS[1], id : 'b13', size : 70},

  {x : 5, y : 9, color : PLAYER_COLORS[2], id : 'b20', size : 70},
  {x : 5, y : 8, color : PLAYER_COLORS[2], id : 'b21', size : 70},
  {x : 5, y : 7, color : PLAYER_COLORS[2], id : 'b22', size : 70},
  {x : 5, y : 6, color : PLAYER_COLORS[2], id : 'b23', size : 70},

  {x : 9, y : 5, color : PLAYER_COLORS[3], id : 'b30', size : 70},
  {x : 8, y : 5, color : PLAYER_COLORS[3], id : 'b31', size : 70},
  {x : 7, y : 5, color : PLAYER_COLORS[3], id : 'b32', size : 70},
  {x : 6, y : 5, color : PLAYER_COLORS[3], id : 'b33', size : 70},
];

export const LINE_LOCATIONS = [
  { height : '36%', width : '0px', top : '4.5%', left : '58.5%' },
  { height : '0px', width : '36%', top : '40.5%', left : '58.5%' },
  { height : '18%', width : '0px', top : '40.5%', left : '94.5%' },
  { height : '0px', width : '36%', top : '58.5%', left : '58.5%' },
  { height : '36%', width : '0px', top : '58.5%', left : '58.5%' },
  { height : '0px', width : '18%', top : '94.5%', left : '40.5%' },
  { height : '36%', width : '0px', top : '58.5%', left : '40.5%' },
  { height : '0px', width : '36%', top : '58.5%', left : '4.5%' },
  { height : '18%', width : '0px', top : '40.5%', left : '4.5%' },
  { height : '0px', width : '36%', top : '40.5%', left : '4.5%' },
  { height : '36%', width : '0px', top : '4.5%', left : '40.5%' },
  { height : '0px', width : '18%', top : '4.5%', left : '40.5%' },
];

export const IMAGE_ARROW_PATH = '/resources/img/arrow.svg';
export const ARROW_LOCATIONS = [
  { top : '29%', left : '1.5%', transform : 'rotate(0deg)' },
  { top : '1.5%', left : '60%', transform : 'rotate(90deg)' },
  { top : '60%', left : '87%', transform : 'rotate(180deg)' },
  { top : '87%', left : '29%', transform : 'rotate(270deg)' },
]