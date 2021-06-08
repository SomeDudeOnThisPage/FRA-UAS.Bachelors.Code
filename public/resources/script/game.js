import Peer from './network/Peer.js';
import {Game} from './game/Game.js';
import Player from './game/Player.js';
import * as utils from './game/utils.js';

const GAME_SERVER_CONNECTION_DEV = 'http://localhost:3000';
const GAME_SERVER_CONNECTION_PROD = 'http://20.56.95.156:3000'; // this should probably be injected by express middleware...

$(window).on('load', () => {
  const socket = io(GAME_SERVER_CONNECTION_DEV);
  const roomID = window.location.pathname.split('/')[2];
  const playerName = "Hi!";//prompt('Enter your name:');

  socket.on('connect', () => {
    socket.emit('game-room-join', roomID, playerName); // Raum beitreten
  });

  socket.on('game-room-joined', (players, started, seed, peerID, iceServers, isHost) => { // falls wir dem Raum beigetreten sind, erstelle von Peer- und Spiel
    let localPlayerIsHost = isHost;

    console.log('[ICE-SERVERS]', iceServers);

    const peer = new Peer(peerID, iceServers); // erstellen des Peers
    peer.setSignalingCallback((data) => socket.emit('signal', roomID, data.target, data)); // Signalisierung VOM Peer weiterleiten
    socket.on('signal', (e) => peer.onsignal(e)); // Signalisierung ZUM Peer weiterleiten

    const game = new Game($('#maedn'), peer); // erstellen des Spiels
    socket.on('game-start', (seed) => game.start(seed));
    if (started) {
      game.seed(seed);
      game.paused = true;
    }
    game.render();

    socket.on('game-room-client-joining', (seed, peerID, color, name) => { // Rückruffunktion für Spielfunktionalität
      game.paused = true;
      game.seed(seed);
      game.addPlayer(new Player(color, name, false));
      utils.uiEnablePlayerKickButtons(game.players, localPlayerIsHost, roomID, socket);
    });

    socket.on('game-room-client-leaving', (peerID, color) => { // Rückruffunktion für Spielfunktionalität
      peer.closeConnection(peerID);
      game.removePlayer(color);
      utils.uiEnablePlayerKickButtons(game.players, localPlayerIsHost, roomID, socket);
    });

    socket.on('game-room-host-migration', (newHostPeerID) => {
      console.log('HOST MIGRATION', newHostPeerID === peerID, newHostPeerID, peerID);
      localPlayerIsHost = newHostPeerID === peerID;
      $('#start-game').prop('disabled', newHostPeerID !== peerID).click(() => socket.emit('start-game', roomID));
      $('#end-game').prop('disabled', newHostPeerID !== peerID).click(() => socket.emit('end-game', roomID));
    });

    socket.on('game-room-kick-player', (peerID, color) => {
      if (game.players[color]) {
        if (game.players[color].isLocalPlayer) {
          // the server removes us when we are kicked, NOT when we disconnect
          // so leave this page normally
          window.location.href = '/';
        } else {
          peer.closeConnection(peerID);
          game.removePlayer(color);
          utils.uiEnablePlayerKickButtons(game.players, localPlayerIsHost, roomID, socket);
        }
      }
    });

    peer.on('onDataChannelsOpen', () => {
      if (localPlayerIsHost) {
        peer.broadcast('gamestate', game.gamestate);
      }
      // unpause whenever ALL dcs to other peers are open (meaning also new ones)
      game.paused = false;
    });

    peer.on('gamestate', (gamestate) => {
      game.setGamestate(gamestate);
      game.paused = false; // unpause when receiving game state
    });

    players.forEach((player) => { // connect to other peers
      if (!player) return;
      player.peerID === peerID ? game.localPlayerColor = player.color : peer.connect(player.peerID);
      game.addPlayer(new Player(player.color, player.name, game.localPlayerColor === player.color));
    });

    utils.uiEnablePlayerKickButtons(game.players, localPlayerIsHost, roomID, socket);

    // utility stuff, don't go over this in document
    $('#start-game').prop('disabled', !localPlayerIsHost).click(() => socket.emit('start-game', roomID, socket.id));
    $('#end-game').prop('disabled', !localPlayerIsHost).click(() => socket.emit('end-game', roomID, socket.id));
  });
});
