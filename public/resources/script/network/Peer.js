export default function Peer(id, iceServers) {
  this.id = id;
  this.callbacks = {};

  this.rtcConfiguration = { iceServers : iceServers };
  this.connections = {};

  this.signal = null;   // callback to send a signaling message to a remote peer
}

Peer.prototype.closeConnections = function() {
  Object.values(this.connections).forEach((connection) => connection.close());
}

Peer.prototype.closeConnection = function(remotePeerId) {
  if (this.connections[remotePeerId]) {
    this.connections[remotePeerId].close();
    delete this.connections[remotePeerId];
  }
}

Peer.prototype.setICETransportPolicy = function(policy) {
  if (policy !== 'relay' && policy !== 'all') {
    console.error('ICE transport policy must be of values [relay, all]');
    return;
  }

  this.rtcConfiguration.iceTransportPolicy = policy;
}

Peer.prototype.setICEServers = function(servers) {
  this.rtcConfiguration.iceServers = servers;
}

Peer.prototype.setSignalingCallback = function(cb) {
  this.signal = cb;
}

Peer.prototype._receiveMessage = function(e) {
  const message = JSON.parse(e.data);

  if (message.event && this.callbacks[message.event]) {
    this.callbacks[message.event](...message.data, message.src);
  }
}

Peer.prototype._dataChannelOpen = function(remotePeerId) {
  console.log(`[DATA CHANNEL] [${remotePeerId}] open`);

  // check if all channels of all connections are open
  if (Object.values(this.connections).every((connection) => {
    return connection.dc.readyState === 'open'
  })) {
    // if a callback for this event exists, run it
    if (this.callbacks['onDataChannelsOpen']) this.callbacks['onDataChannelsOpen']();
  }
}

Peer.prototype._createConnection = function(remotePeerId) {
  const connection = new RTCPeerConnection(this.rtcConfiguration);
  connection.dc = {}; // list of data channels belonging to this connection

  // setup a reliable and ordered data channel, store in connection object
  const channel = connection.createDataChannel('game', {
    negotiated : true,
    id : 0,
    maxRetransmits : null,    // no maximum number of retransmits
    ordered : true            // force ordered package retrieval
  });
  channel.onmessage = (e) => this._receiveMessage(e);
  channel.onopen = () => this._dataChannelOpen(channel.label, remotePeerId);

  connection.dc = channel;

  connection.onsignalingstatechange = () => {
    console.log(`[SIGNALING STATE] [${remotePeerId}] ${connection.signalingState}`);
  }

  connection.onicecandidate = (e) => {
    console.log(`[TRICKLE-ICE] found ICE-Candidate for ${remotePeerId}`, e.candidate);
    this.signal(this._createSignal('ice-candidate', e.candidate, remotePeerId));
  }

  connection.onicecandidateerror = (e) => {
    if (e.errorCode >= 300 && e.errorCode <= 699) {
      // STUN errors are in the range 300-699. See RFC 5389, section 15.6
      // for a list of codes. TURN adds a few more error codes; see
      // RFC 5766, section 15 for details.
      console.warn('STUN-Server could not be reached or threw error.', e)
    } else if (e.errorCode >= 700 && e.errorCode <= 799) {
      // Server could not be reached; a specific error number is
      // provided but these are not yet specified.
      console.warn('TURN-Server could not be reached.', e)
    }
  }

  return connection;
}

/*
 * Protokoll:
 * {
 *   type   : string,  -> Typ des Signals [offer|answer|ice-candidate]
 *   src    : peer-id, -> Peer-ID des Senders
 *   target : peer-id, -> Peer-ID des Empfängers
 *   sdp    : string   -> Die SDP-Daten des Signals
 * }
 */
Peer.prototype._createSignal = function(type, data, target) {
  return {type : type, src : this.id, target : target, data : data}
}

Peer.prototype.connect = function(remotePeerId) {
  const connection = this._createConnection(remotePeerId, true);
  this.connections[remotePeerId] = connection;

  connection.createOffer().then((offer) => {
    this.signal(this._createSignal('offer', offer, remotePeerId));
    console.log('[JSEP] set local description');
    return connection.setLocalDescription(offer);
  }).catch((e) => console.error(e));
}

Peer.prototype.onsignal = function(e) {
  if (e.target && e.target === this.id) {
    switch(e.type) {
      case 'offer': // on offer, create our answer, set our local description and signal the remote peer
        const connection = this._createConnection(e.src);
        this.connections[e.src] = connection;

        connection.setRemoteDescription(e.data).then(() => {
          console.log('[JSEP] set remote description');
          return connection.createAnswer();
        }).then((answer) => {
          this.signal(this._createSignal('answer', answer, e.src));
          console.log('[JSEP] set local description');
          return connection.setLocalDescription(answer);
        }).catch((e) => console.error(e));
        break;
      case 'answer': // on answer, set our remote description
        this.connections[e.src].setRemoteDescription(e.data).then(() => console.log('[JSEP] set remote description')).catch(e => console.error(e));
        break;
      case 'ice-candidate': // on ice candidate, add the ice candidate to the corresponding connection
        this.connections[e.src].addIceCandidate(e.data).then(() => {
          console.log(`[TRICKLE-ICE] added ICE-Candidate from ${e.src}`, e.data);
        });
        break;
    }
  }
}

Peer.prototype.on = function(e, cb) {
  this.callbacks[e] = cb;
}

// TODO: not needed for mesh-architecture - maybe remove?
Peer.prototype.emit = function(target, e, ...args) { // function for the master peer to relay a targeted message
  if (this.connections[target]) {
    const data = JSON.stringify({src : this.id, event: e, data: args});
    this.connections[target].dc.send(data);
  }
}

// TODO: not needed for mesh-architecture - maybe remove?
Peer.prototype.relay = function(exclude,packet) { // function for the master peer to relay a message
  Object.keys(this.connections).forEach((key) => {
    if (key !== exclude) {
      this.connections[key].dc.send(packet);
    }
  });
}

Peer.prototype.broadcast = function(e, ...args) { // function for any peer to broadcast a message
  Object.values(this.connections).forEach((connection) => {
    const data = JSON.stringify({src : this.id, event: e, data: args});
    connection.dc.send(data);
  });
}
