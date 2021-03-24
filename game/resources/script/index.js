import GamePeer from "./network/GamePeer.js";
import {destroyChatEvents, setupChatEvents} from "./chatUtils.js";
import {ConnectionManager} from "./network/ConnectionManager.js";
import {GameTest} from "./game/GameTest.js";
import {random} from "./network/netutils.js";

/*
 * Mensch-Ärgere-Dich-Nicht board game thing prototype for my final thesis project.
 */
$(document).on('DOMContentLoaded', () => {
  // TODO: when our peer is the master peer, signal all slaves one all data-channels to the slaves have been opened
  // TODO: when our peer is a slave, block (or buffer) messages until our master signals us that all their connections are open
  const peer = new GamePeer((data) => connection.socket.emit('signal', connection.room, data), []);
  const connection = new ConnectionManager(peer);

  setupChatEvents(peer, connection.playerMeta); // initialize chat events like sending and receiving messages

  peer.on('master-peer-ready', () => {
    console.log('The master peer has signaled us that they are ready!');
    $('#btn-generate-random-number').prop('disabled', false);
  });

  // navbar handlers // TODO: util module
  $('#disconnect').click(() => {
    peer.closeConnections(); // destroy any connections left
    // TODO: connection leave room => clear player meta
    $('#connect-page').css({'display' : 'block'});
    $('#game-page').css({'display' : 'none'});
  });

  $(window).on('beforeunload', () => peer.closeConnections());

  // everything below here is testing stuff
  const game = new GameTest($('#maedn'), peer.id);
  game.render();

  $('#btn-generate-random-number').click(() => {
    const num = Math.floor(Math.random() * 6);
    console.log('our random number is ', num);

    random(Date.now(), peer, connection.playerMeta.players, num, true).then((num) => {
      console.log('The random number is ', num);
      $('#p-fair-number').text(`Dice: ${num % 6 + 1}`);
    });
  });

  peer.on('ls-commit-init', (id) => {
    const num = Math.floor(Math.random() * 6);
    console.log('our random number is ', num);

    random(id, peer, connection.playerMeta.players, num).then((num) => {
      console.log('The random number is ', num);
      $('#p-fair-number').text(`Dice: ${num % 6 + 1}`);
    });
  });
});
