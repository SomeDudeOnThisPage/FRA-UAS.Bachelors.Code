const RoomManager = function() {
  this.clients = {}; // client to room associations -> clientId : room
  this.rooms = {};   // room : [client, client, client, ...]
}

RoomManager.prototype.createRoom = function(app, passphrase, host) {
  // generate 4 digit id - this is a very bad implementation but its a prototype soooo...
  let id = Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 4);
  while (this.rooms[id]) {
    id = Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 4);
  }

  this.rooms[id] = {
    clients : [],
    passphrase : passphrase,
    host : undefined,
    started : false,
    seed : undefined // generated on game start
  };
  return id;
}

RoomManager.prototype.addClientToRoom = function(joiner, roomId, socket) {
  const room = this.rooms[roomId];

  // it's easier to forward signal when storing the socket id of the client in the client object...
  joiner.socket = socket.id;

  // give the client a player index - this index is the first free index between 0-3
  // I'M SURE THERE IS A MORE EFFICIENT WAY TO DO THIS BUT I WAS LAZY!!!
  const usedPlayerIndices = room.clients.map((client) => client.playerIndex);
  if (!usedPlayerIndices.includes(0)) {
    joiner.playerIndex = 0;
  }
  else if (!usedPlayerIndices.includes(2)) { // fill slot 2 first because it makes for a better game experience
    joiner.playerIndex = 2;
  }
  else if (!usedPlayerIndices.includes(1)) {
    joiner.playerIndex = 1;
  }
  else if (!usedPlayerIndices.includes(3)) {
    joiner.playerIndex = 3;
  }

  // remove the joiner from any rooms they are currently in (room switching)
  if (this.clients[joiner.socket]) {
    this.removeClientFromRoom(joiner.socket, this.clients[joiner.socket], socket);
  }

  // add / update the joiners current room id
  this.clients[joiner.socket] = roomId;

  // if there is no host in the room, assign the joiner as host
  if (!room.host) {room.host = joiner.socket;}

  // add the joiner to the list of clients in the room
  room.clients.push(joiner);

  // notify the joining client with the data they need to establish peer connections
  // (other clients in the room, room id and peer id of the host)
  console.log(room.host, socket.id, joiner.socket.id);
  socket.emit('game-room-joined', room.clients, room.host === socket.id);

  // notify the rest of the clients in the room that the joiner is joining
  room.clients.forEach((client) => socket.to(client.socket).emit('game-room-client-joining', joiner));
}

RoomManager.prototype.removeClientFromRoom = function(socketId, roomId, socket) {
  const room = this.rooms[roomId];

  // remove the clients' room association
  delete this.clients[socketId];

  // find leaver by their socket id
  const leaver = room.clients.find((client) => client.socket === socketId);

  // remove leaver from client list in room
  room.clients = room.clients.filter((client) => client.socket !== socketId);

  // notify other clients that the leaver is leaving
  room.clients.forEach((client) => socket.to(client.socket).emit('game-room-client-leaving', leaver));

  // check if we need to migrate the host (the leaver was host and there's players in the room)
  /*if (leaver.socket === room.host && room.clients.length > 0) {
    room.host = room.clients[0].socket;

    // notify the other clients that they need to connect to the new host
    room.clients.forEach((client) => socket.to(client.socket).emit('game-room-host-migration', this.getHost(roomId).peerId));
  }*/

  this.destroyRoom(roomId);
}

RoomManager.prototype.destroyRoom = function(id, force) {
  // delete a room if there are no players inside
  if (this.rooms[id] && this.rooms[id].clients.length <= 0 || force) {
    console.log('[ROOM REMOVED]', id);
    delete this.rooms[id];
  }
}

RoomManager.prototype.getRoom = function(id) {
  return this.rooms[id];
}

module.exports = RoomManager;
