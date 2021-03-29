import Peer from "./network/Peer.js";
import {Room} from "./network/Room.js";
import {setupChatEvents} from "./chatUtils.js";
import {Connection} from "./network/Connection.js";
import {GameTest} from "./game/GameTest.js";
import {random} from "./network/netutils.js";

console.log('fugg');

const peer = new Peer();
const connection = new Connection(peer);
const room = new Room(connection.socket, peer);

peer.setSignalingCallback((data) => {
  if (room.id && data.target) {
    connection.socket.emit('signal', room.id, data)
  }
});

$(window).on('load', () => {
  //const name = window.prompt('I am too lazy to create a name-input so write it here.', 'Unknown Player');
  const name = 'player';

  const roomId = window.location.pathname.split('/')[2];

  // attempt to join the room we retrieved from the url
  connection.socket.emit('game-room-join', roomId, 'test', {
    peerId : peer.id,
    name : name
  });

  connection.socket.on('game-room-join-failed', () => {
    alert('This Room does not exist!');
  });

  peer.on('master-peer-ready', () => {
    console.log('The master peer has signaled us that they are ready!');
    $('#btn-generate-random-number').prop('disabled', false);
  });

  // not strictly needed as the browser should destroy any open connections for this context, but good practise
  $(window).on('beforeunload', () => peer.closeConnections());
});

$(document).on('DOMContentLoaded', () => {
  setupChatEvents(peer, room); // initialize chat events like sending and receiving messages

  // everything below here is testing stuff
  const game = new GameTest($('#maedn'), peer.id);
  game.render();

  $('#btn-generate-random-number').click(() => {
    const num = Math.floor(Math.random() * 6);
    console.log('our random number is ', num);

    random(Date.now(), peer, room.players.length, num, true).then((num) => {
      console.log('The random number is ', num);
      $('#p-fair-number').text(`Dice: ${num % 6 + 1}`);
    });
  });

  peer.on('ls-commit-init', (id) => {
    const num = Math.floor(Math.random() * 6);
    console.log('our random number is ', num);

    random(id, peer, room.players.length, num).then((num) => {
      console.log('The random number is ', num);
      $('#p-fair-number').text(`Dice: ${num % 6 + 1}`);
    });
  });
});