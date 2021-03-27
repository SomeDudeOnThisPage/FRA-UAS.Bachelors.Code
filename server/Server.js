const crypto = require('crypto'); // for credential generation
const RoomManager = require('./RoomManager.js');

const config = require('./config.json');

/*
 * Signaling and Room-Management Server for my Thesis Project.
 * This server uses socket.io to manage connecting, disconnecting,
 * joining and leaving of rooms.
 *
 * A room is represented by a 4-letter ID, and can house a set of clients.
 * Additionally, a room can have a password restricting who can and
 * cannot join.
 *
 * Signaling is done exclusively via the 'signal'-message. All this
 * event listener does is pass a message from one client to another.
 * The content of this message is to be set and evaluated by the
 * peer-to-peer API, not the signaling mechanism.
 *
 * This server is used to generate TURN user credentials for the CoTurn
 * server as well - using the 'request-turn-credentials' event listener
 *
 * The server reacts to the following events:
 * 1. request-turn-credentials
 *    -> generates a set of ICE-Servers with temporary credentials for the client
 *    -> returns them via the request-turn-credentials-response event to the calling client
 * 2. game-room-create (password, client)
 *    -> creates a new room and puts the client inside
 *    -> results in the event 'game-room-joined' for the calling client
 *    -> results in the event 'game-room-client-joining' for all clients in the room
 * 3. game-room-join (id, password, client)
 *    -> puts a client in a room, removing them from any room they are currently in
 *    -> results in the event 'game-room-joined' for the calling client
 *    -> results in the event 'game-room-client-joining' for all clients in the room
 *
 * TODO: list others here too
 */

const server = require('http').createServer((req, res) => res.end()).listen(
  config.server.listeningPort, config.server.listeningAddress
);

// set cors origin to wildcard to allow chrome browsers to connect to this server
// as this is only a prototype for testing, this should suffice
const io = require('socket.io')(server, {cors : {origin : '*'}});

// room manager for managing clients joining and leaving rooms, as well as host migration
const manager = new RoomManager();

io.sockets.on('connection', (socket) => {
  console.log(`[LOBBY] client '${socket.id}' connected`)

  // Credential structure: password is the HMAC of 'timestamp:username' with the shared secret used by CoTurn.
  // The timestamp is in UNIX-format and represents the max lifetime of the credential.
  // The username is simply the socket-id for our purposes.
  socket.on('request-turn-credentials', () => {
    const timestamp = Date.now() + config.ice.staticAuthCredentialLifetime * /* ms to hours */ 3600000;
    const username = `${timestamp}:${socket.id}`;
    const hmac = crypto.createHmac('sha1', config.ice.staticAuthSecret);
      hmac.setEncoding('base64');
      hmac.write(username);
      hmac.end();
    const passphrase = hmac.read();

    socket.emit('request-turn-credentials-response', [
      { urls: config.ice.stunServerAddress, username: username, credential: passphrase },
      { urls: config.ice.turnServerAddress, username: username, credential: passphrase }
    ]);
  });

  socket.on('game-room-create', (password, client) => manager.addClientToRoom(client, manager.createRoom(password), socket));

  socket.on('game-room-join', (id, password, joiner) => {
    const room = manager.getRoom(id);
    console.log(id);

    if (!room) return socket.emit('game-room-join-failed', 'no such room');
    if (room.passphrase !== password) return socket.emit('game-room-join-failed', 'wrong password');

    manager.addClientToRoom(joiner, id, socket);
  });

  // WebRTC signaling
  socket.on('signal', (roomId, e) => {
    // find target client in the list of clients in a room, and pass on the signal if a room and target inside are found
    const room = manager.getRoom(roomId);

    if (room) {
      const target = room.clients.find((client) => client.peerId === e.target)
      if (target) socket.to(target.socket).emit('signal', e);
    }
  });

  socket.on('disconnecting', () => {
    // TODO: manual disconnection without page close (e.g. via button on client side)
    // TODO: this should then obviously not result in new TURN-credentials being generated
    const roomId = manager.clients[socket.id];
    if (roomId) {
      console.log(`[LOBBY] client '${socket.id}' left`);
      manager.removeClientFromRoom(socket.id, roomId, socket);
    }
  });
});