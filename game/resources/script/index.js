import GamePeer from "./network/GamePeer.js";
import {destroyChatEvents, setupChatEvents} from "./chatUtils.js";
import {ConnectionManager} from "./network/ConnectionManager.js";
import {GameTest} from "./game/GameTest.js";
import {uuid4} from "./utils.js";
import {random} from "./network/netutils.js";

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

  // add own player
  game.players.push({
    id : peer.id,
  });

  $('#genlockstep').click(() => {
    const num = Math.floor(Math.random() * 6);
    console.log('our random number is ', num);

    random(Date.now(), peer, connection.playerMeta.players, num, true).then((num) => {
      console.log('The random number is ', num);
    });
  });

  peer.on('ls-commit-init', (id) => {
    const num = Math.floor(Math.random() * 6);
    console.log('our random number is ', num);

    random(id, peer, connection.playerMeta.players, num).then((num) => {
      console.log('The random number is ', num);
    });
  });
});
