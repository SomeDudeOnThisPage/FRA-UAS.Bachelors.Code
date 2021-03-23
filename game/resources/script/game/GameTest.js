/*
 * For now just some crappy testing on how to generate a decent looking board.
 */

// play tile positions in 11x11 grid
const tiles = [
  4, 0,
  4, 1,
  4, 2,
  4, 3,
  4, 4,

  3, 4,
  2, 4,
  1, 4,
  0, 4,
  0, 5,

  0, 6,
  1, 6,
  2, 6,
  3, 6,
  4, 6,

  4, 7,
  4, 8,
  4, 9,
  4, 10,
  5, 10,

  6, 10,
  6, 9,
  6, 8,
  6, 7,
  6, 6,

  7, 6,
  8, 6,
  9, 6,
  10, 6,
  10, 5,

  10, 4,
  9, 4,
  8, 4,
  7, 4,
  6, 4,

  6, 3,
  6, 2,
  6, 1,
  6, 0,
  5, 0
]

const makeTiles = (board) => {
  // create 12 lines
  const lineTest1 = $('<div>');
  lineTest1.css({
    'border' : '1px solid black',
    'width' : '0px',
    'height' : '36%', // 36
    'position' : 'absolute',
    'top' : '4.5%',
    'left' : '58.5%' // 54 + 9/2
  });
  board.append(lineTest1);

  const lineTest2 = $('<div>');
  lineTest2.css({
    'border' : '1px solid black',
    'width' : '36%',
    'height' : '0px', // 36
    'position' : 'absolute',
    'top' : '40.5%',
    'left' : '58.5%' // 54 + 9/2
  });
  board.append(lineTest2);

  const lineTest3 = $('<div>');
  lineTest3.css({
    'border' : '1px solid black',
    'width' : '0px',
    'height' : '18%',
    'position' : 'absolute',
    'top' : '40.5%',
    'left' : '94.5%' // 54 + 9/2
  });
  board.append(lineTest3);

  const lineTest4 = $('<div>');
  lineTest4.css({
    'border' : '1px solid black',
    'width' : '36%',
    'height' : '0px', // 36
    'position' : 'absolute',
    'top' : '58.5%',
    'left' : '58.5%' // 54 + 9/2
  });
  board.append(lineTest4);

  let c = 0;

  for (let i = 0; i < 80; i+=2) {
    const tileContainer = $('<div>');
    tileContainer.css({
      'background-color' : 'transparent',
      'width' : `10%`,
      'height' : `10%`,
      'border-radius' : '50%',
      'position' : 'absolute',
      'top' : `${tiles[i] * 9}%`,
      'left' : `${tiles[i + 1] * (9)}%`
    });


    const tile = $('<div>');
    tile.addClass(`tile-${c++}`);
    tile.css({
      'background-color' : 'white',
      'border' : `2px solid black`,
      'width' : `80%`,
      'height' : `80%`,
      'border-radius' : '50%',
      'transform' : 'translate(10%, 10%)' // vertical and horizontal center
    });

    if (i === 0) {
      const p = $('<p>');
      p.text('A');
      p.css({
        'text-align' : 'center',
        'vertical-align' : 'middle',
        'display' : 'table-cell',
        'font-weight' : 'bold',
        'font-size' : `100%`,
        'font-family' : 'Verdana',
      });
      tile.append(p);

      tile.css({
        'display' : 'table',
        'background-color' : 'yellow'
      });
    }

    if (i === 20) {
      const img = $('<img id="dynamic">');
      img.attr('src', './resources/img/Letter_A.svg');
      img.css({
        'width' : '90%',
        'height' : '90%',
        'vertical-align' : 'middle',
      });
      tile.css({
        'background-color' : 'green'
      });

      tile.append(img);
    }

    tileContainer.append(tile);

    board.append(tileContainer);
  }
}

export function GameTest(root, localPlayerId) {
  this.root = root;
  this.localPlayerId = localPlayerId;
  this.gamestate = {
    players : [],
    currentPlayerId : undefined
    /*
     * players = [
     *   {pieces : []},
     *   {pieces : []}
     * ],
     *
     * currentPlayerId : ...,
     *
     */
  }

  this.localPlayer = localPlayerId;
  this.currentPlayer = 0;
  this.players = [];

  this.diceRoll = undefined;

  const self = this;
  this.fsmGame = new StateMachine({
    init : 'dice',
    transitions : [
      //{ name : 'startGame', from : 'start', to : 'dice' },
      { name : 'diceThrown', from : 'dice', to : 'move' },
      { name : 'madeMove', from : 'move', to : 'dice' }
    ],
    methods : {
      onDiceThrown : (n) => {console.log('ONDICETHROWN', n)},
      onMadeMove : () => {

      }
    }
  });

  this.fsm = new StateMachine({
    init : 'idleState',
    transitions: [
      { name: 'lockstepCommitInit', from: 'idleState',  to: 'lockstepCommitState'},
      { name: 'lockstepCommitFinished', from: 'lockstepCommitState', to: 'lockstepRevealState'},
      { name: 'lockstepRevealFinished', from: 'lockstepRevealState', to: 'idleState'},
    ],
    methods: {
      onLockstepCommitInit: () => { console.log('---------------- LOCKSTEP COMMIT INITIALIZATION ----------------') },
      onLockstepCommitFinished: () => { console.log('----------------- LOCKSTEP COMMIT FINISHED -----------------') },
      onLockstepRevealFinished: () => { console.log('----------------- LOCKSTEP REVEAL FINISHED -----------------') },
    }
  });
}

GameTest.prototype.render = function() {
  this.root.empty(); // todo: only recreate figures here or something
  makeTiles(this.root);
}

GameTest.prototype.throwDice = function(number) {
  if (this.fsmGame.state === 'dice') {
    this.diceRoll = number;
    this.fsmGame.diceThrown(number);
  }
}

GameTest.prototype.makeMove = function() {
  if (this.fsmGame.state === 'move') {
    this.fsmGame.madeMove();
    this.currentPlayer = this.currentPlayer++ % 4;
  }
}