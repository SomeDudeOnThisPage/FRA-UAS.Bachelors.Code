/*
 * Signaling and Room-Management Server for Thesis Project.
 * This server uses socket.io to manage connecting, disconnecting,
 * joining and leaving of rooms.
 *
 * A room is represented by a name, and can house a set of clients.
 * Additionally, a room can have a password restricting who can and
 * cannot join.
 *
 * Signaling is done exclusively via the 'signal'-message. All this
 * endpoint does is pass a message from one client to another.
 * The content of this message is to be set and evaluated by the
 * peer-to-peer API, not the signaling mechanism.
 */

const SERVER_PORT = 1234;

// create HTTP-Server
const server = require('http').createServer((req, res) => {
  res.end(); // do nothing
}).listen(SERVER_PORT);

// set cors origin to wildcard to allow chrome browsers to connect to this server
// as this is only a prototype for testing, this should suffice
// (don't do this in ANY production environment EVER)
const io = require('socket.io')(server, {cors : {origin : '*'}});

/*
 * room data with reference to clients in room
 * {
 *  [roomName] : {
 *    password : xxx,
 *    clients : []
 *  }
 * }
*/
const rooms = {};

io.sockets.on('connection', (socket) => {
  console.log(`[LOBBY] client '${socket.id}' connected`)

  const emitToAllRoomClients = (roomName, type, ...data) => {
    const room = rooms[roomName];
    if (room) {
      room.clients.forEach((client) => {
        socket.to(client.socket).emit(type, ...data);
      });
    }
  }

  socket.on('create-room', (roomName, password, client) => {
    const room = {
      name : roomName,
      password : password,
      clients : []
    };

    // create room means we always have one client, so make that client a master peer
    room.masterPeerId = client.peerId;

    socket.emit('joined-room', room.name, room.clients, room.masterPeerId);

    room.clients.push(client);
    rooms[roomName] = room;
  });

  socket.on('join-room', (roomName, password, client) => {
    const room = rooms[roomName];

    if (!room || !room.clients) {
      return socket.emit('wrong-room'); // notify client that their room doesn't exist
    }

    if (!room.clients[socket]) {
      if (password === room.password) {
        emitToAllRoomClients(room.name, 'client-connecting', client); // notify all other clients in the room
        room.clients.push(client); // add client to rooms' clients

        return socket.emit('joined-room', room.name, room.clients, room.masterPeerId);
      } else {
        return socket.emit('wrong-password'); // notify client that their password is wrong
      }
    }
  });

  socket.on('signal', (roomName, e) => {
    // find target client in the list of clients in a room, and pass on the signal if one is found
    const room = rooms[roomName];
    if (room) {
      const targetClient = room.clients.find((client) => {
        return client.peerId === e.target;
      });
      if (targetClient) {
        socket.to(targetClient.socket).emit('signal', e);
      }
    }
  });

  socket.on('disconnecting', () => {
    Object.values(rooms).forEach((room) => { // delete client from their rooms (if any)
      const disconnectingClient = room.clients.find((client) => client.socket === socket.id);
      if (disconnectingClient) {
        room.clients = room.clients.filter((client) => client.socket !== socket.id); // remove client from room
        emitToAllRoomClients(room.name, 'client-disconnect', disconnectingClient); // notify other clients of disconnect

        // if the client is the rooms' host peer, signal host migration (just use next peer for now)
        if (room.masterPeerId === disconnectingClient.peerId && room.clients.length > 0) {
          console.log(`[HOST MIGRATION] ${room.name} '${room.clients[0].peerId}' is the new host`)
          room.masterPeerId = room.clients[0].peerId;
          emitToAllRoomClients(room.name, 'host-migration', room.clients[0].peerId);
        }

        // delete room if no more clients are present
        if (room.clients.length <= 0) {
          delete rooms[room.name];
          console.log('deleted room');
        }
      }
    });
  });
});