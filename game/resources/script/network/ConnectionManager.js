import {PlayerMetaData, PlayerMetaDataContainer} from "./PlayerMeta.js";
import {appendMessageToChat, createMessage} from "../chatUtils.js";

/**
 * Handles interfacing between socket-client and peers via PlayerMetaData.
 * Handles the connection aspects of connecting, disconnecting, signal, joining, as well as creating and leaving rooms.
 *
 * This class holds a PlayerMetaDataContainer which contains data used to cross-reference signaling- (socket) and
 * peer- (UUID) IDs.
 *
 * @constructor
 */
export function ConnectionManager(localPeer) {
  this.socket = io('http://localhost:1234'); // TODO: dynamic
  this.room = undefined;
  this.playerMeta = new PlayerMetaDataContainer();

  this.socket.on('host-migration', (masterPeerId) => {
    $('#btn-generate-random-number').prop('disabled', true);

    localPeer.closeConnections();

    if (masterPeerId === localPeer.id) {
      // if we are the master, let other peers connect
      console.log('[HOST MIGRATION] we are now the master peer');
      localPeer.isMasterPeer = true;
    } else {
      console.log('[HOST MIGRATION] we are now a slave peer');
      localPeer.connect(masterPeerId);
    }
  });

  // handle joining a room and connecting to all other peers in that room
  this.socket.on('joined-room', (roomName, clients, masterPeerId) => {

    this.room = roomName;

    clients.forEach((client) => {
      if (client.peerId !== localPeer.id) {
        this.playerMeta.addPlayer(new PlayerMetaData(client.name, client.peerId, client.socket));
      }
    });

    if (masterPeerId === localPeer.id) {
      // if we are the master, let other peers connect
      console.log('we are the master peer');
      localPeer.isMasterPeer = true;
    } else {
      // otherwise, connect to the master peer
      console.log('we are a slave peer - our master peer is  [' + masterPeerId + ']');
      localPeer.connect(masterPeerId); // => last joined clients is ALWAYS the initiator to all other clients
    }

    // TODO: move this...
    $('#connect-page').css({'display' : 'none'});
    $('#game-page').css({'display' : 'block'});
  });

  // setup callback when a client joins our current room
  this.socket.on('client-connecting', (client) => {
    $('#btn-generate-random-number').prop('disabled', true);

    const meta = new PlayerMetaData(client.name, client.peerId, client.socket);
    this.playerMeta.addPlayer(meta);
    appendMessageToChat(createMessage(client.peerId, `'${client.name}' is connecting.`), meta.name);
  });

  // setup callback when a client leaves our current room
  this.socket.on('client-disconnect', (client) => {
    const meta = this.playerMeta.getPlayerBySocketId(client.socket);
    if (meta) {
      appendMessageToChat(createMessage(client.peerId, `'${client.name}' disconnected.`), meta.name);
      this.playerMeta.removePlayerByPeerId(client.peerId);
    }

    // terminate peer connection
    localPeer.closeConnection(client.peerId);
  });

  // pass on signals to our local peer
  this.socket.on('signal', (e) => {
    localPeer.onsignal(e);
  });

  this.socket.on('wrong-room', () => {
    alert('If you tried to create a room, this room already exists. Try joining the room! If you' +
      'tried to join a room, this room doesn\'t exist. Try creating the room!');
  });

  this.socket.on('wrong-password', () => {
    alert('Wrong Password!');
  });

  this.setupEvents(localPeer);
}

ConnectionManager.prototype.setupEvents = function(localPeer) {
  // handle create / join page
  $('#create-lobby-submit').click(() => {
    const playerName = $('#player-name').val();

    // todo: room password
    this.socket.emit('create-room', $('#join-lobby-name').val(), 'test', {
      socket : this.socket.id,
      peerId : localPeer.id,
      name : playerName
    });

    this.playerMeta.addPlayer(new PlayerMetaData(playerName, localPeer.id, this.socket.id));
  });

  $('#join-lobby-submit').click(() => {
    const playerName = $('#player-name').val();

    this.socket.emit('join-room', $('#join-lobby-name').val(), 'test', {
      socket : this.socket.id,
      peerId : localPeer.id,
      name : playerName
    });

    this.playerMeta.addPlayer(new PlayerMetaData(playerName, localPeer.id, this.socket.id));
  });
}
