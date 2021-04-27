const express = require('express');
const config = require('./config.json');
const utils = require('./utils.js');

const app = express();

const server = require('http').Server(app);
const io = require('socket.io')(server);
app.use(express.static(config.server.static));

// serve files
app.get('/', (req, res) => {
  res.status(200);
  res.sendFile(`${__dirname}${config.server.index}`);
});

app.get(`/game/*/`, (req, res) => {
  res.status(200);
  console.log(__dirname);
  res.sendFile(`${__dirname}${config.server.game}`);
});

server.listen(config.server.listeningPort);

// room = {
//   id = <four-letter room ID>
//   started = true | false
//   host = <socket-ID of the host>
//   players = []
// }
const rooms = {};

// we don't want to store the socket-ids of players inside the player array of the room, because we don't want to send
// them to the players when they connect. But we need to find the socket-id of a peer when signaling, so this object
// mapping peerID -> socketID of every player exists.
const sockets = {};

io.sockets.on('connection', (socket) => {
  socket.on('game-room-create', () => {
    const id = utils.generateRoomID(rooms);
    rooms[id] = {
      id : id, // easier to identify room by player
      players : [],
      started : false,
      host : null
    };

    // if no client joins within a minute, destroy the room again (something went wrong on the clients' side, as the redirect didn't go through)
    setTimeout(() => {
      delete rooms[id];
    }, 60000);

    // const room = manager.createRoom(app, 'Test');
    socket.emit('game-room-created', id);
  });

  const PLAYER_SLOT_PRIORITY = [0, 2, 1, 3]; // Als erstes gegenüberliegende Farben füllen
  socket.on('game-room-join', (roomID) => {
    const room = rooms[roomID];

    if (!room) return socket.emit('game-room-join-failed', 'no such room');
    if (Object.keys(room.players).length >= 4) return socket.emit('game-room-join-failed', 'room full');
    if (room.started) return socket.emit('game-room-join-failed', 'The Game has started, hot-joining sessions is currently not supported.');

    for (let i = 0; i < 4; i++) {
      if (!room.players[PLAYER_SLOT_PRIORITY[i]]) {
        const peerID = utils.uuid4();
        const color = PLAYER_SLOT_PRIORITY[i];

        socket.join(roomID); // broadcasting for a subset of sockets is done via socket.io rooms
        sockets[peerID] = socket.id; // sockets mapped to peer-id for signaling (can't be in player object, because we don't want to send that)
        room.players[color] = {peerID : peerID, color : color};

        if (!room.host) {
          room.host = socket.id;
        }

        // Beigetretenen Spieler Benachrichtigen
        socket.emit('game-room-joined', room.players, peerID, utils.generateTURNCredentials(socket.id), room.host === socket.id);

        // Alle anderen Spieler über den neuen Spieler benachrichtigen
        // room.players.forEach((player) => socket.to(playerSockets[player.peerID]).emit('game-room-client-joining', peerID, color));
        socket.to(roomID).emit('game-room-client-joining', peerID, color);
        break;
      }
    }
  });

  socket.on('start-game', (roomId) => {
    const room = rooms[roomId];

    if (room && !room.started && room.host === socket.id) {
      room.started = true;

      // Seed für die Zufallsfunktion
      room.seed = Math.random();

      // Seed an alle Spieler des Raums senden
      socket.to(roomId).emit('game-start', room.seed);
      // auch an den Host-Spieler (quirk mit socket.io, socket.to(socket) funktioniert nicht bei gleichem socket)!
      socket.emit('game-start', room.seed);
    }
  });

  socket.on('signal', (roomID, targetID, e) => {
    const room = rooms[roomID];

    if (room) {
      const target = room.players.find((player) => player && player.peerID === targetID);
      if (target) {
        socket.to(sockets[target.peerID]).emit('signal', e);
      }
    }
  });

  /*
   * SHORTER VERSION OF SIGNAL-EVENT FOR DOCUMENT, WITHOUT CHECKS
   * socket.on('signal', (roomID, targetID, e) => {
   *   const room = rooms[roomID];
   *   const target = room.players.find((player) => player && player.peerID === targetID);
   *   socket.to(sockets[target.peerID]).emit('signal', e);
   * });
   */

  socket.on('disconnecting', () => {
    // the following search operations aren't super efficient when the player count gets large,
    // but it's for the sake of having less LOC to clutter up the document.
    // if this was an actual production application, there should likely be a map of
    // socketID -> {peerID, roomID} for each socket connected, to have O(1) lookup times
    const peerID = Object.keys(sockets).find((peerID) => sockets[peerID] === socket.id);
    const room = Object.values(rooms).find((room) => room.players.find((player) => player && player.peerID === peerID));

    if (room) {
      const leaver = room.players.find((player) => player && player.peerID === peerID);
      if (leaver) {
        room.players = room.players.filter((player) => player && player.peerID !== peerID); // remove from room
        if (room.players.length > 0) {
          socket.to(room.id).emit('game-room-client-leaving', leaver.peerID, leaver.color); // notify remaining
        } else {
          delete rooms[room.id]; // remove the room when the last player left the room
        }
      }
    }
  });
});
