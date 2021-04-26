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

    socket.on('game-room-joined', (players, peerID, iceServers, isHost) => { // falls wir dem Raum beigetreten sind, erstelle von Peer- und Spiel
      console.log(iceServers);
      const peer = new Peer(peerID, iceServers, DATA_CHANNELS); // erstellen des Peers
      peer.setSignalingCallback((data) => socket.emit('signal', roomID, data.target, data)); // Signalisierung VOM Peer weiterleiten
      socket.on('signal', (e) => peer.onsignal(e)); // Signalisierung ZUM Peer weiterleiten

      const game = new Game($('#maedn'), peer, DATA_CHANNELS[0].label); // erstellen des Spiels
      socket.on('game-start', (seed) => game.start(seed));
      game.render();

      socket.on('game-room-client-joining', (peerID, color) => { // Rückruffunktion für Spielfunktionalität
        game.addPlayer(new Player(color, 'TestPlayer', false));
      });

      socket.on('game-room-client-leaving', (peerID, color) => { // Rückruffunktion für Spielfunktionalität
        game.removePlayer(color);
        peer.closeConnection(peerID);
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