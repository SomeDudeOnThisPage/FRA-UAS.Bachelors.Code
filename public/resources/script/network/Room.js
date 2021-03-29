import {appendMessageToChat, createMessage} from "../chatUtils.js";

export function Room(socket, peer) {
  this.players = [];
  this.id = undefined;
  this.masterPeerId = undefined;

  // WE have JOINED (or created, as we join a created room by default) a game room
  socket.on('game-room-joined', (id, clients, hostPeerId) => {
    this.id = id;
    this.masterPeerId = hostPeerId;

    peer.isMasterPeer = hostPeerId === peer.id;
    console.log(peer.isMasterPeer ? 'we are the host peer' : 'we are a client peer');
    console.log('room id', this.id);

    this.players = clients;

    if (! peer.isMasterPeer) {
      peer.connect(this.masterPeerId);
    }

    // Enable game page - TODO: move this...
    //$('#connect-page').css({'display' : 'none'});
    //$('#game-page').css({'display' : 'block'});
    $('#room-id').html(`Room-Code: <b>${id}</b> (click to copy)`).click(() => {
      navigator.clipboard.writeText(window.location.href).then(() => {
        console.log('copied');
      }, () => {
        console.log('on no');
      });
    }).fadeIn().css({'visibility' : 'visible'});

    $('#game-page').fadeIn();
  });

  // ANOTHER PLAYER is JOINING the game room
  socket.on('game-room-client-joining', (client) => {
    $('#btn-generate-random-number').prop('disabled', true);

    this.players.push(client);
    appendMessageToChat(createMessage(client.peerId, `'${client.name}' is connecting.`), client.name);
  });

  // ANOTHER PLAYER is LEAVING the game room
  socket.on('game-room-client-leaving', (client) => {
    if (this.players.find((player) => player.peerId === client.peerId)) {
      // if the player exists, append a notification chat message and close the connection
      this.players = this.players.filter((player) => player.peerId !== client.peerId);
      appendMessageToChat(createMessage(client.peerId, `'${client.name}' disconnected.`), client.name);

      peer.closeConnection(client.peerId);
    }
  });

  // the HOST has LEFT the game room - receive new HOST id, re-establish connection to new host
  socket.on('game-room-host-migration', (masterPeerId) => {
    $('#btn-generate-random-number').prop('disabled', true);

    peer.closeConnections(); // close any open connections

    this.masterPeerId = masterPeerId;
    peer.isMasterPeer = peer.id === this.masterPeerId;

    // re-connect all client peers (if they do not have their credentials yet, they will connect upon receiving them)
    if (peer.rtcConfiguration.iceServers && !peer.isMasterPeer) {
      peer.connect(this.masterPeerId);
    }
  });
}