import {decryptNumber, encryptNumber, uuid4} from "../utils.js";

// TODO: Promise rejections

export const random = (id, peer, playerAmount, random, init) => {
  const data = {
    id : id,
    passphrase : uuid4(),
    random : random,
    commitments : {},
    actions : {}
  }

  if (init) {
    peer.broadcast('ls-commit-init', data.id);
  }

  return new Promise((res, rej) => {
    peer.broadcast('ls-commit', data.id, encryptNumber(random, data.passphrase)) // send our own commitment

    commit(peer, playerAmount, data).then((commitments) => {
      peer.broadcast('ls-action', id, data.passphrase);

      resolve(peer, playerAmount, data).then((actions) => {
        let total = random;
        Object.keys(actions).forEach((participant) => {
          const commitment = commitments[participant];
          const action = actions[participant];

          if (commitment && action) {
            const randomNumber = decryptNumber(commitment, action);
            console.log(`[${participant}] random number : ${randomNumber}`);
            total += randomNumber;
          }
        });

        res(total);
      });
    });
  });
}

const commit = (peer, playerAmount, data) => {
  return new Promise((resolve, reject) => {
    const commitments = {};

    peer.on('ls-commit', (id, commitment, remoteId) => {
      if (id === data.id && !commitments[remoteId]) {
        commitments[remoteId] = commitment;

        if (Object.values(commitments).length === playerAmount - /* ourselves */ 1) {
          resolve(commitments);
        }
      }
    });
  });
}

const resolve = (peer, playerAmount, data) => {
  return new Promise((resolve, reject) => {
    const actions = {};
    peer.on('ls-action', (id, action, remoteId) => {
      if (id === data.id && !actions[remoteId]) {
        console.log('received action');
        actions[remoteId] = action;

        if (Object.keys(actions).length === playerAmount - /* ourselves */ 1) {
          resolve(actions);
        }
      }
    });
  });
}
