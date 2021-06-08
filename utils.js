const config = require('./config.json');
const crypto = require('crypto');

module.exports = {
  generateTURNCredentials : (user) => {
    const timestamp = Math.floor(Date.now() / 1000 + config.ice.staticAuthCredentialLifetime * 3600);
    const username = `${timestamp}:${user}`;
    const hmac = crypto.createHmac('sha1', config.ice.staticAuthSecret);
    hmac.setEncoding('base64');
    hmac.write(username);
    hmac.end();
    const passphrase = hmac.read();

    return [
      { urls: config.ice.stunServerAddress },
      { urls: config.ice.turnServerAddress, username: username, credential: passphrase }
    ];
  },
  generateRoomID : (existing) => {
    let id = Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 4);
    while (existing[id]) {
      id = Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 4);
    }
    return id;
  },
  uuid4 : () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}
