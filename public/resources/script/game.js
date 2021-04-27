import Peer from './network/Peer.js';
import {Game} from './game/Game.js';
import Player from './game/Player.js';

const GAME_SERVER_CONNECTION_DEV = 'http://localhost:3000';
const GAME_SERVER_CONNECTION_PROD = null;

const DATA_CHANNELS = [{ // reliable, ordered data channel
  label : 'game',
  rtcDataChannelConfig : {
    maxRetransmits : null,    // no maximum number of retransmits
    ordered : true            // force ordered package retrieval
  }
}];

$(window).on('load', () => {
  const socket = io(GAME_SERVER_CONNECTION_DEV);
  const roomID = window.location.pathname.split('/')[2];

  socket.on('connect', () => {
    socket.emit('game-room-join', roomID); // Raum beitreten

    socket.on('game-room-joined', (players, started, seed, peerID, iceServers, isHost) => { // falls wir dem Raum beigetreten sind, erstelle von Peer- und Spiel
      console.log(iceServers, players);
      const peer = new Peer(peerID, iceServers, DATA_CHANNELS); // erstellen des Peers
      peer.setSignalingCallback((data) => socket.emit('signal', roomID, data.target, data)); // Signalisierung VOM Peer weiterleiten
      socket.on('signal', (e) => peer.onsignal(e)); // Signalisierung ZUM Peer weiterleiten

      const game = new Game($('#maedn'), peer, DATA_CHANNELS[0].label); // erstellen des Spiels
      socket.on('game-start', (seed) => game.start(seed));
      started ? game.start(seed) : game.seed(seed);
      game.render();

      socket.on('game-room-client-joining', (seed, peerID, color) => { // Rückruffunktion für Spielfunktionalität
        game.paused = true; // pause game until data channels are open
        game.seed(seed);
        game.addPlayer(new Player(color, 'TestPlayer', false));
      });

      socket.on('game-room-client-leaving', (peerID, color) => { // Rückruffunktion für Spielfunktionalität
        peer.closeConnection(peerID);
        game.removePlayer(color);
      });

      peer.on('onDataChannelsOpen', () => {
        if (isHost) {
          peer.broadcast(game.dataChannel, 'gamestate', game.gamestate);
        }

        // unpause upon all data channels open -> only if gamestate initialized
        // if (game.gamestate.fsm !== 'starting') {
          game.paused = false;
        // }
      });

      peer.on('gamestate', (gamestate) => {
        if (game.gamestate.fsm === 'starting') {
          console.log('GAMESTATE', gamestate);
          game.gamestate = gamestate;
          game.paused = false;

          // JQuery-'Bug': we need to recreate Piece-Objects on receiver-side, because their JQuery-elements are different
          game.gamestate.pieces.forEach((pieces, index) => {
            if (pieces) {
              pieces.forEach((piece) => {
                game.board.put(piece, game.players[index])
              });
            }
          });
        }
      });

      players.forEach((player) => { // Verbindung zu anderen Peers aufbauen
        if (!player) return;
        player.peerID === peerID ? game.localPlayerColor = player.color : peer.connect(player.peerID);
        game.addPlayer(new Player(player.color, 'TestPlayer', game.localPlayerColor === player.color));
      });

      // utility stuff, don't go over this in document
      $('#start-game').prop('disabled', !isHost).click(() => socket.emit('start-game', roomID, socket.id));
      $('#end-game').prop('disabled', !isHost).click(() => socket.emit('end-game', roomID, socket.id));
    });
  });
});

$(document).on('DOMContentLoaded', () => {
  //setupChatEvents(peer, room); // initialize chat events like sending and receiving messages
});