import {appendMessageToChat, createMessage} from "../chatUtils.js";
import {GameTest} from "../game/GameTest.js";
import Player from "../game/Player.js";

/**
 * Mostly acts as a wrapper for socket-events happening in our room.
 * @constructor
 */
export function Room() {
  this.id = null;
  this.game = null;
  this.isHost = false;
}

Room.prototype._connectToOtherPeers = function(clients, peer) {
  // Mesh Network
  clients.forEach((client) => {
    if (client.peerId !== peer.id) {
      peer.connect(client.peerId);
    } else {
      this.game.localPlayerId = client.playerIndex;
    }
    this.game.addPlayer(new Player(client.playerIndex, 'TestPlayer', this.game.localPlayerId === client.playerIndex));
  });
}

/**
 * Attempts to join the room specified by roomID. Requires the connection object, a player name and the players
 * peer to use for sending data and playing the game.
 * @param connection
 * @param roomID
 * @param name
 * @param peer
 * @returns A promise object resolved on a successful room join, rejected when the room could not be joined.
 */
Room.prototype.join = function(connection, roomID, name, peer) {
  this.id = roomID;

  return new Promise((resolve, reject) => {
    // attempt to join the room we retrieved from the url
    connection.socket.emit('game-room-join', this.id, 'test', {peerId : peer.id, name : name});

    // if the join fails, reject the promise
    connection.socket.on('game-room-join-failed', (message) => reject(message));

    connection.socket.on('game-room-joined', (clients, isHost) => {
      this.isHost = isHost;
      this.game = new GameTest($('#maedn'), peer);
      this.game.render();

      // setup client join and leave callbacks
      connection.socket.on('game-room-client-joining', (client) => {
        this.game.addPlayer(new Player(client.playerIndex, 'TestPlayer', this.game.localPlayerId === client.playerIndex));
        appendMessageToChat(createMessage(client.peerId, `'${client.name}' is connecting.`), client.name);
      });

      connection.socket.on('game-room-client-leaving', (client) => {
        this.game.removePlayer(client.playerIndex);
        peer.closeConnection(client.peerId);
        appendMessageToChat(createMessage(client.peerId, `'${client.name}' disconnected.`), client.name);
      });

      // enable host buttons if we are the host
      $('#start-game').prop('disabled', !this.isHost).click(() => connection.socket.emit('start-game', this.id));
      $('#end-game').prop('disabled', !this.isHost).click(() => connection.socket.emit('end-game', this.id));

      // start-game receives the random seed needed for the game to function
      // this seed is obviously the same for every peer
      connection.socket.on('game-started', (seed) => this.game.start(seed));

      // create WebRTC connections (offers for all other peers in this room)
      this._connectToOtherPeers(clients, peer);

      resolve(clients, isHost);
    });
  });
}
