import Peer from "./network/Peer.js";
import {Room} from "./network/Room.js";
import {setupChatEvents} from "./chatUtils.js";
import {Connection} from "./network/Connection.js";

const peer = new Peer();
peer.setICETransportPolicy('relay');
const connection = new Connection(peer);
const room = new Room();

window.room = room;

peer.setSignalingCallback((data) => {
  if (room.id && data.target) {
    connection.socket.emit('signal', room.id, data)
  }
});

$(window).on('load', () => {
  const name = 'player';
  const roomID = window.location.pathname.split('/')[2];

  // attempt to join the room given in the URL
  room.join(connection, roomID, name, peer).then(() => {
    // make DOM elements showing the current room visible and click-to-copyable
    $('#room-id').html(`Room-Code: <b>${roomID}</b> (click to copy)`).click(() => navigator.clipboard.writeText(window.location.href)
      .then(() => {}, () => {}))
      .fadeIn().css({'visibility' : 'visible'});

    // show game
    $('#game-page').fadeIn();
  }, () => (reason) => alert('failed to join room: ' + reason));

  // not strictly needed as the browser should destroy any open connections for this context, but good practise
  $(window).on('beforeunload', () => peer.closeConnections());
});

$(document).on('DOMContentLoaded', () => {
  setupChatEvents(peer, room); // initialize chat events like sending and receiving messages

  $('#btn-generate-random-number').click(() => {
    room.game.roll(true);
  });
});