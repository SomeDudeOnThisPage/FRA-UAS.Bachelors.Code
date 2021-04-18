const express = require('express');
const config = require('./config.json');
const utils = require('./utils.js');

const app = express();

const server = require('http').Server(app);
const io = require('socket.io')(server);
app.use(express.static("public"));

// serve files
app.get('/', (req, res) => {
  res.status(200);
  res.sendFile(`${__dirname}${config.server.index}`);
});

app.get(`/game/*/`, (req, res) => {
  res.status(200);
  console.log(__dirname);
  res.sendFile(`${__dirname}/public/game.html`);
});

server.listen(config.server.listeningPort);

const rooms = {};
const playerSockets = {};

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

        socket.join(roomID);

        playerSockets[peerID] = socket.id;
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
        socket.to(playerSockets[target.peerID]).emit('signal', e);
      }
    }
  });

  socket.on('disconnecting', () => {
    const peerID = Object.keys(playerSockets).find((peerID) => playerSockets[peerID] === socket.id);
    const room = Object.values(rooms).find((room) => room.players.find((player) => player && player.peerID === peerID));

    if (room) {
      const leaver = room.players.find((player) => player && player.peerID === peerID);
      if (leaver) {
        console.log(leaver.color);
        // remove from room
        room.players = room.players.filter((player) => player && player.peerID !== peerID);
        socket.to(room.id).emit('game-room-client-leaving', leaver.peerID, leaver.color);
      }
    }
  });
});