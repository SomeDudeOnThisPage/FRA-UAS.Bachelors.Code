import {appendMessageToChat, createMessage} from "../chatUtils.js";

/*
 * Handles socket callbacks and manages a list of players.
 */
export function ConnectionManager(peer) {
  this.socket = io('http://localhost:1234');
  this.players = [];
  this.room = undefined;
  this.masterPeerId = undefined;

  // WE have JOINED (or created, as we join a created room by default) a game room
  this.socket.on('game-room-joined', (id, clients, hostPeerId) => {
    this.room = id;
    this.masterPeerId = hostPeerId;

    peer.isMasterPeer = hostPeerId === peer.id;
    console.log(peer.isMasterPeer ? 'we are the host peer' : 'we are a client peer');
    console.log('room id', this.room);

    this.players = clients;

    this.socket.emit('request-turn-credentials'); // request our TURN credentials

    // Enable game page - TODO: move this...
    $('#connect-page').css({'display' : 'none'});
    $('#game-page').css({'display' : 'block'});
    $('#room-id').html(`Room-Code: <b>${id}</b>`);
  });

  // WE have received our TURN credentials
  this.socket.on('request-turn-credentials-response', (servers) => {
    // set our TURN credentials
    peer.setICEServers(servers);

    // once we have our TURN credentials, we can begin connecting to our master peer
    // if we are the master peer, do nothing and wait for incoming connections
    if (!peer.isMasterPeer) {
      peer.connect(this.masterPeerId);
    }
  });

  // ANOTHER PLAYER is JOINING the game room
  this.socket.on('game-room-client-joining', (client) => {
    $('#btn-generate-random-number').prop('disabled', true);

    this.players.push(client);
    appendMessageToChat(createMessage(client.peerId, `'${client.name}' is connecting.`), client.name);
  });

  // ANOTHER PLAYER is LEAVING the game room
  this.socket.on('game-room-client-leaving', (client) => {
    if (this.players.find((player) => player.peerId === client.peerId)) {
      // if the player exists, append a notification chat message and close the connection
      this.players = this.players.filter((player) => player.peerId !== client.peerId);
      appendMessageToChat(createMessage(client.peerId, `'${client.name}' disconnected.`), client.name);

      peer.closeConnection(client.peerId);
    }
  });

  // the HOST has LEFT the game room - receive new HOST id, re-establish connection to new host
  this.socket.on('game-room-host-migration', (masterPeerId) => {
    $('#btn-generate-random-number').prop('disabled', true);

    peer.closeConnections(); // close any open connections

    this.masterPeerId = masterPeerId;
    peer.isMasterPeer = peer.id === this.masterPeerId;

    // re-connect all client peers (if they do not have their credentials yet, they will connect upon receiving them)
    if (peer.rtcConfiguration.iceServers && !peer.isMasterPeer) {
      peer.connect(this.masterPeerId);
    }
  });

  // signaling
  this.socket.on('signal', (e) => {
    peer.onsignal(e);
  });

  this.setupEvents(peer);
}

ConnectionManager.prototype.setupEvents = function(peer) {
  $('#create-lobby-submit').click(() => this.socket.emit('game-room-create', 'test', {
    peerId : peer.id,
    name : $('#player-name').val()
  }));

  $('#join-lobby-submit').click(() => this.socket.emit('game-room-join', $('#join-lobby-name').val(), 'test', {
    peerId : peer.id,
    name : $('#player-name').val()
  }));
}
