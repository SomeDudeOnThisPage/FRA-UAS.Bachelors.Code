/**
 * Utility mapping object. Holds player meta-data (meaning data not directly related to the game).
 * This meta-data is exchanged when a client connects, and used for signaling.
 * @constructor
 */
export function PlayerMetaDataContainer() {
  this.players = [];
}

PlayerMetaDataContainer.prototype.getPlayerByPeerId = function(peerId) {
  return this.players.find((meta) => {
    return meta.peerId === peerId;
  });
}

PlayerMetaDataContainer.prototype.getPlayerBySocketId = function(socketId) {
  return this.players.find((meta) => {
    return meta.socketId === socketId;
  });
}

PlayerMetaDataContainer.prototype.addPlayer = function(meta) {
  this.players.push(meta);
}

PlayerMetaDataContainer.prototype.removePlayerByPeerId = function(peerId) {
  this.players = this.players.filter((meta) => {
    return meta.peerId !== peerId;
  });
}

/**
 * Each player has a metadata-object.
 * For now this only contains the name, socket-id and peer-id to cross-associate these values.
 * @param name
 * @param peerId
 * @param socketId
 * @constructor
 */
export function PlayerMetaData(name, peerId, socketId) {
  this.name = name;
  this.peerId = peerId;
  this.socketId = socketId;
}

PlayerMetaData.prototype.toPacket = function() {
  return {
    name : this.name,
    peerId : this.peerId,
    socketId : this.socketId
  };
}
