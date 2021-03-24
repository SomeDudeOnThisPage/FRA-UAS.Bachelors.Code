import {decryptNumber, encryptNumber, uuid4} from "../utils.js";

// TODO: Promise rejections

export const random = (id, peer, players, random, init) => {
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

    commit(peer, players, data).then((commitments) => {
      peer.broadcast('ls-action', id, data.passphrase);

      resolve(peer, players, data).then((actions) => {
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

const commit = (peer, players, data) => {
  return new Promise((resolve, reject) => {
    // setTimeout(() => {
    //   reject();
    // }, 5000);

    const commitments = {};

    peer.on('ls-commit', (id, commitment, remoteId) => {
      if (id === data.id && !commitments[remoteId]) {
        commitments[remoteId] = commitment;

        if (Object.values(commitments).length === players.length - /* ourselves */ 1) {
          resolve(commitments);
        }
      }
    });
  });
}

const resolve = (peer, players, data) => {
  return new Promise((resolve, reject) => {
    const actions = {};
    peer.on('ls-action', (id, action, remoteId) => {
      if (id === data.id && !actions[remoteId]) {
        console.log('received action');
        actions[remoteId] = action;

        if (Object.keys(actions).length === players.length - /* ourselves */ 1) {
          resolve(actions);
        }
      }
    });
  });
}
