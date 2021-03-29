export function Connection(peer) {
  this.socket = io('http://localhost:1234');//io('http://20.56.95.156:1234');

  // credentials are per session - a session in this context is a socket connection
  this.socket.on('connect', () => this.socket.emit('request-turn-credentials'));
  this.socket.on('request-turn-credentials-response', (servers) => peer.setICEServers(servers));
  this.socket.on('signal', (e) => peer.onsignal(e));
}
