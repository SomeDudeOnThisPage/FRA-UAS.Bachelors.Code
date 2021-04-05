import {decryptNumber, encryptNumber, uuid4} from "../utils.js";

// This promise initiates a distributed random number generation, and returns the sum of random numbers once it has
// finished.
// Note that this should also be initiated when the peer receives the 'ls-commit-init'-event, with 'init' set to false.
export const random = (id, peer, playerAmount, random, player, init) => {
  const data = {
    id : id,
    passphrase : uuid4(),
    random : random,
    commitments : {},
    actions : {}
  }

  if (init) {
    peer.broadcast('ls-commit-init', data.id, player);
  }

  return new Promise((resolve, reject) => {
    peer.broadcast('ls-commit', data.id, encryptNumber(random, data.passphrase)) // send our own commitment

    commit(peer, playerAmount, data).then(() => {
      let total = random;
      Object.keys(data.actions).forEach((participant) => {
        const commitment = data.commitments[participant];
        const action = data.actions[participant];

        if (commitment && action) {
          const randomNumber = decryptNumber(commitment, action);
          // console.log(`[${participant}] random number : ${randomNumber}`);
          total += randomNumber;
        }
      });

      resolve(total);
    });
  });
}

const commit = (peer, playerAmount, data) => {
  return new Promise((resolve, reject) => {

    peer.on('ls-commit', (id, commitment, remoteId) => {
      if (id === data.id && !data.commitments[remoteId]) {
        data.commitments[remoteId] = commitment;

        // broadcast our action when we have all commitments
        if (Object.values(data.commitments).length === playerAmount - /* ourselves */ 1) {
          peer.broadcast('ls-action', id, data.passphrase);
        }
      }
    });

    peer.on('ls-action', (id, action, remoteId) => {
      if (id === data.id && !data.actions[remoteId]) {
        data.actions[remoteId] = action;

        // resolve when we have all actions
        if (Object.keys(data.actions).length === playerAmount - /* ourselves */ 1) {
          resolve();
        }
      }
    });
  });
}
