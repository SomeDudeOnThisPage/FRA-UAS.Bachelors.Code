import {uuid4} from '../utils.js';

export default function GamePeer(sendSignal, servers) {
  this.id = uuid4();
  this.callbacks = {};
  this.servers = servers;        // ICE-Servers
  this.connections = {};         // master has N-1 connections, slaves have only one connection to their master
  this.sendSignal = sendSignal;  // callback to send a signaling message to a remote peer
  this.isMasterPeer = false;     // decided by signaling server on joining a room
}

GamePeer.prototype.closeConnections = function() {
  Object.values(this.connections).forEach((connection) => {
    connection.close();
  });
}

GamePeer.prototype.closeConnection = function(remotePeerId) {
  if (this.connections[remotePeerId]) {
    this.connections[remotePeerId].close();
    delete this.connections[remotePeerId];
  }
}

GamePeer.prototype._receiveMessage = function(e) {
  const message = JSON.parse(e.data);

  if (this.isMasterPeer) {
    // if the message is targeted, emit to target peer - else relay to all other peers
    message.target ? this.emit(message.target, e.data) : this.relay(message.src, e.data);
  }

  if (message.event && this.callbacks[message.event]) {
    this.callbacks[message.event](...message.data, message.src)
  }
}

GamePeer.prototype._dataChannelOpen = function(remotePeerId) {
  console.log('DATA CHANNEL OPEN');
}

GamePeer.prototype._createConnection = function(remotePeerId, rtcConfiguration, isInitiator) {
  const connection = new RTCPeerConnection(rtcConfiguration);

  if (isInitiator) {
    console.log('connecting');

    // setup a reliable and ordered data channel, store in connection object
    connection.dc = connection.createDataChannel('dc');
    connection.dc.onmessage = (e) => this._receiveMessage(e);
    connection.dc.onopen = () => this._dataChannelOpen();
  } else {
    // otherwise, we need to receive the data channel and store them in the connection object
    connection.ondatachannel = (e) => {
      console.log('ondatachannel', e);
      if (e.channel) {
        connection.dc = e.channel;
        connection.dc.onmessage = (e) => this._receiveMessage(e);
        connection.dc.onopen = () => this._dataChannelOpen(remotePeerId);
      }
    }
  }

  connection.onsignalingstatechange = () => {
    console.log(`[${remotePeerId}] signaling state '${connection.signalingState}'`);
  }

  return connection;
}

GamePeer.prototype._createSignal = function(type, data, target) {
  return {
    type : type,
    src : this.id,
    target : target,
    data : data
  }
}

GamePeer.prototype.connect = function(remotePeerId) {
  const connection = this._createConnection(remotePeerId, this.servers, true);
  this.connections[remotePeerId] = connection;

  connection.onicecandidate = (e) => {
    console.log('icecandidate', e);
    if (e.candidate) {// e.candidate === null means we finished gathering ice candidates
      this.sendSignal(this._createSignal('ice-candidate', e.candidate, remotePeerId));
    }
  }

  connection.createOffer().then((offer) => {
    connection.setLocalDescription(offer).then(() => {
      this.sendSignal({         // signal the remote peer to inform them of our offer
        type : 'offer',         // tell the remote peer what type of signal this is
        src : this.id,          // tell the remote peer (and signaling server) who this signal is from
        target : remotePeerId,  // tell the remote peer (and signaling server) who this signal is addressed to
        data : connection.localDescription // offer is our local description
      });
    })
  });
  /*connection.setLocalDescription(await connection.createOffer());
  this.sendSignal({         // signal the remote peer to inform them of our offer
    type : 'offer',         // tell the remote peer what type of signal this is
    src : this.id,          // tell the remote peer (and signaling server) who this signal is from
    target : remotePeerId,  // tell the remote peer (and signaling server) who this signal is addressed to
    data : connection.localDescription // offer is our local description
  });*/
}

GamePeer.prototype.onsignal = function(e) {
  console.log(e);
  if (e.target && e.target === this.id) {
    switch(e.type) {
      // on offer, create our answer, set our local description and signal the remote peer
      case 'offer':
        console.log('OFFER', e.data);
        const connection = this._createConnection(e.src, this.servers, /* isInitiator */ false);
        this.connections[e.src] = connection;

        connection.setRemoteDescription(e.data).then(() => {
          connection.createAnswer().then((answer) => {
            connection.setLocalDescription(answer).then(() => {
              this.sendSignal(this._createSignal('answer', connection.localDescription, e.src));
            })
          });
        });
        //await connection.setLocalDescription(await connection.createAnswer());
        //this.sendSignal(this._createSignal('answer', connection.localDescription, e.src));
        break;
      // on answer, set our remote description
      case 'answer':
        this.connections[e.src].setRemoteDescription(e.data).then();
        //await this.connections[e.src].setRemoteDescription(e.data);
        break;
      // (trickle-ice) on ice-candidate, add it to our list of candidates
      case 'ice-candidate':
        this.connections[e.src].addIceCandidate(e.data).then();
        //await this.connections[e.src].addIceCandidate(e.data);
        break;
    }
  }
}

GamePeer.prototype.on = function(e, cb) {
  this.callbacks[e] = cb;
}

GamePeer.prototype.emit = function(target, packet) { // function for the master peer to relay a targeted message
  if (this.connections[target]) {
    this.connections[target].dc.send(packet);
  }
}

GamePeer.prototype.relay = function(exclude, packet) { // function for the master peer to relay a message
  Object.keys(this.connections).forEach((key) => {
    if (key !== exclude) {
      this.connections[key].dc.send(packet);
    }
  });
}

GamePeer.prototype.broadcast = function(e, ...args) { // function for any peer to broadcast a message
  Object.values(this.connections).forEach((connection) => {
    connection.dc.send(JSON.stringify({src : this.id, event: e, data: args}));
  });
}
