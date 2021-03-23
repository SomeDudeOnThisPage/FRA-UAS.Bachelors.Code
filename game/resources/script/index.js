import GamePeer from "./network/GamePeer.js";
import {destroyChatEvents, setupChatEvents} from "./chatUtils.js";
import {ConnectionManager} from "./network/ConnectionManager.js";
import {GameTest} from "./game/GameTest.js";
import {uuid4} from "./utils.js";

/*
 * Mensch-Ärgere-Dich-Nicht board game prototype developed for my final thesis project.
 * TODO: write some more stuff here like what does what and stuff
 */

$(document).on('DOMContentLoaded', () => {
  const peer = new GamePeer((data) => connection.socket.emit('signal', connection.room, data), []);
  const connection = new ConnectionManager(peer);

  // initialize chat events like sending and receiving messages
  setupChatEvents(peer, connection.playerMeta);

  // navbar handlers // TODO: util module
  $('#disconnect').click(() => {
    peer.closeConnections(); // destroy any connections left
    // TODO: connection leave room => clear player meta
    $('#connect-page').css({'display' : 'block'});
    $('#game-page').css({'display' : 'none'});
  });

  // destroy all connections on unload (not specifically needed, but good practice)
  $(window).on('beforeunload', () => {
    // destroy any connections left
    peer.closeConnections();
    destroyChatEvents();
  });

  // everything below here is testing stuff
  // TODO: game
  const game = new GameTest($('#maedn'), peer.id);
  game.render();

  peer.on('sync-gamestate', (gamestate) => {
    game.gamestate = gamestate;
  });

  // add own player
  game.players.push({
    id : peer.id,
    playing : false // the player will begin playing once the next round starts
  });

  $('#makemove').click(() => {
    console.log('CAN MAKE MOVE', game.gamestate.currentPlayerId === peer.id);
    if (game.gamestate.currentPlayerId === peer.id) {
      peer.broadcast('sync-gamestate', game.gamestate);
    }
  });

  /*peer.on('dc-open', (remotePeerId) => {
    console.log('DATA CHANNEL OPEN');
    // create player
    if (game.players.length > 4) {
      game.players.push({
        id : remotePeerId,
        playing : false // the player will begin playing once the next round starts
      });
    }

    game.localPlayer = game.players.length - 1;

    peer.on('game-move', (data, remotePeerId) => {
      if (game.players[game.currentPlayer].id === remotePeerId) {
        console.log('data');
        // ready all newly joined players
        for (const player of game.players) {
          player.playing = true;
        }

        // next player move

      }
    });
  });*/

  const encryptNumber = (number, passphrase) => {
    return CryptoJS.AES.encrypt(JSON.stringify({number : number}), passphrase).toString();
  }

  const decryptNumber = (encrypted, passphrase) => {
    const decrypted = CryptoJS.AES.decrypt(encrypted, passphrase);
    const json = JSON.parse(decrypted.toString(CryptoJS.enc.Utf8));
    return json.number;
  }

  const LOCKSTEP_DATA = {
    id : {},
    ourRandom : undefined,
    passphrase : undefined,
    commitments : {},
    actions : {}
  }

  $('#genlockstep').click(() => {
    // if no LS is going on, create new
    if (game.fsm.state === 'idleState') {
      game.fsm.lockstepCommitInit();

      const random = Math.floor(Math.random() * 6);

      //const participants = Object.keys(peer.connections);
      //const step = ls.createStep(uuid4(), participants, {rn : random, passphrase : uuid4()});

      LOCKSTEP_DATA.id = Date.now();
      LOCKSTEP_DATA.passphrase = uuid4();
      LOCKSTEP_DATA.ourRandom = random;
      console.log('our random is ' + random);

      peer.broadcast('lockstep-commit-init', LOCKSTEP_DATA.id); // prompt other peers to generate their random numbers and send c
      peer.broadcast('lockstep-commit', LOCKSTEP_DATA.id, encryptNumber(random, LOCKSTEP_DATA.passphrase)) // send our own commitment
    }
  });

  peer.on('lockstep-commit-init', (id) => {
    if (game.fsm.state === 'idleState') {
      game.fsm.lockstepCommitInit();

      const random = Math.floor(Math.random() * 6);

      LOCKSTEP_DATA.id = id;
      LOCKSTEP_DATA.passphrase = uuid4();
      LOCKSTEP_DATA.ourRandom = random;

      console.log('our random is ' + random);

      peer.broadcast('lockstep-commit', LOCKSTEP_DATA.id, encryptNumber(random, LOCKSTEP_DATA.passphrase)) // send our own commitment
    }
  });

  peer.on('lockstep-commit', (id, c, remotePeerId) => {
    console.log('received commitment');
    if (game.fsm.state === 'idleState') {
      console.warn('received lockstep commitment out of order, throwing away');
      //game.fsm.lockstepCommitInit();
    }

    if (game.fsm.state === 'lockstepCommitState' && id === LOCKSTEP_DATA.id) {
      LOCKSTEP_DATA.commitments[remotePeerId] = c;

      // only continue if we have commitments from all peers with an open connection
      for (const player of connection.playerMeta.players) {
        if (player.peerId !== peer.id && !LOCKSTEP_DATA.commitments[player.peerId]) {
          return;
        }
      }

      game.fsm.lockstepCommitFinished();
      // start sending our revealing passphrase
      console.log('sent action')
      peer.broadcast('lockstep-action', id, LOCKSTEP_DATA.passphrase);
    }
  });

  peer.on('lockstep-action', (id, a, remotePeerId) => {
    // all peers MUST send their commitment BEFORE any action
    if (game.fsm.state === 'lockstepRevealState' && id === LOCKSTEP_DATA.id) {
      console.log('received action');

      LOCKSTEP_DATA.actions[remotePeerId] = a;

      // only continue if we have actions from all peers who have sent a commitment
      for (const remote of Object.keys(LOCKSTEP_DATA.commitments)) {
        if (!LOCKSTEP_DATA.actions[remote]) {
          return;
        }
      }

      game.fsm.lockstepRevealFinished();

      // our own data
      let total = LOCKSTEP_DATA.ourRandom;

      // decrypt the commitments using the actions (passphrases)
      Object.keys(LOCKSTEP_DATA.actions).forEach((participant) => {
        const commitment = LOCKSTEP_DATA.commitments[participant];
        const action = LOCKSTEP_DATA.actions[participant];

        if (commitment && action) {
          const randomNumber = decryptNumber(commitment, action);
          console.log(`[${participant}] random number : ${randomNumber}`);

          total += randomNumber;
        }
      });

      const fairDiceRoll = total % 6 + 1;
      console.log('The Fair Dice Roll totals to', fairDiceRoll);

      $('#fair-number').text(fairDiceRoll);

      // clear step
      LOCKSTEP_DATA.ourRandom = undefined;
      LOCKSTEP_DATA.id = undefined;
      LOCKSTEP_DATA.commitments = {};
      LOCKSTEP_DATA.actions = {};
    }
  });
});
