import Peer from './network/Peer.js';
import {Game} from './game/Game.js';
import Player from './game/Player.js';

const DATA_CHANNELS = [{ // reliable, ordered data channel
  label : 'game',
  rtcDataChannelConfig : {
    maxRetransmits : null,    // no maximum number of retransmits
    ordered : true            // force ordered package retrieval
  }
}];

const socket = io('http://localhost:1234');

$(window).on('load', () => {
  const roomID = window.location.pathname.split('/')[2];
  socket.on('connect', () => {
    // Raum beitreten
    socket.emit('game-room-join', roomID);

    // Falls wir dem Raum beigetreten sind, erstelle von Peer- und Spiel
    socket.on('game-room-joined', (players, peerID, iceServers, isHost) => {
      // erstellen des Peers
      const peer = new Peer(peerID, iceServers, DATA_CHANNELS);
      peer.setSignalingCallback((data) => socket.emit('signal', roomID, data.target, data)); // Signalisierung VOM Peer weiterleiten
      socket.on('signal', (e) => peer.onsignal(e)); // Signalisierung ZUM Peer weiterleiten

      // erstellen des Spiels
      const game = new Game($('#maedn'), peer, DATA_CHANNELS[0].label);
      socket.on('game-start', (seed) => {game.start(seed); console.log('START')});
      game.render();

      // Rückruffunktionen für Spielfunktionalität
      socket.on('game-room-client-joining', (peerID, color) => {
        console.log('joined', peerID, color);
        game.addPlayer(new Player(color, 'TestPlayer', false));
      });

      socket.on('game-room-client-leaving', (peerID, color) => {
        console.log('LEAVER FUCK');
        game.removePlayer(color);
        peer.closeConnection(peerID);
      });

      // Verbindung zu anderen Peers aufbauen
      console.log('PLAYERS', players);
      players.forEach((player) => {
        if (player) {
          if (player.peerID !== peerID) {
            peer.connect(player.peerID);
          } else {
            game.localPlayerId = player.color;
          }
          game.addPlayer(new Player(player.color, 'TestPlayer', game.localPlayerId === player.color));
        }
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