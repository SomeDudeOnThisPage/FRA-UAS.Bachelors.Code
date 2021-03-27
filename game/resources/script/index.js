import GamePeer from "./network/GamePeer.js";
import {setupChatEvents} from "./chatUtils.js";
import {ConnectionManager} from "./network/ConnectionManager.js";
import {GameTest} from "./game/GameTest.js";
import {random} from "./network/netutils.js";

/*
 * Mensch-Ärgere-Dich-Nicht board game thing prototype for my final thesis project.
 */
$(document).on('DOMContentLoaded', () => {
  const peer = new GamePeer((data) => connection.socket.emit('signal', connection.room, data));
  const connection = new ConnectionManager(peer);

  setupChatEvents(peer, connection); // initialize chat events like sending and receiving messages

  peer.on('master-peer-ready', () => {
    console.log('The master peer has signaled us that they are ready!');
    $('#btn-generate-random-number').prop('disabled', false);
  });

  $(window).on('beforeunload', () => peer.closeConnections());

  // everything below here is testing stuff
  const game = new GameTest($('#maedn'), peer.id);
  game.render();

  $('#btn-generate-random-number').click(() => {
    const num = Math.floor(Math.random() * 6);
    console.log('our random number is ', num);

    random(Date.now(), peer, connection.players.length, num, true).then((num) => {
      console.log('The random number is ', num);
      $('#p-fair-number').text(`Dice: ${num % 6 + 1}`);
    });
  });

  peer.on('ls-commit-init', (id) => {
    const num = Math.floor(Math.random() * 6);
    console.log('our random number is ', num);

    random(id, peer, connection.players.length, num).then((num) => {
      console.log('The random number is ', num);
      $('#p-fair-number').text(`Dice: ${num % 6 + 1}`);
    });
  });
});
