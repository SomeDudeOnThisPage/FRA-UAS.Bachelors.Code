const getPlayer = (players, id) => {
  return players.find((player) => player.peerId === id);
}

export const setupChatEvents = (peer, room) => {
  // create default event handlers
  $('#chat-input-submit').click(() => {
    submitMessage(peer, getPlayer(room.players, peer.id).name);
  });

  $('#chat-input').keypress((e) => {
    if (e.which === 13) { submitMessage(peer, getPlayer(room.players, peer.id).name); }
  });

  // handle local peer chat event
  peer.on('chat', (packet) => {
    if (packet && packet.src) {
      // chat messages are sent over WebRTC data channels, so packet.src is a peerId
      const player = getPlayer(room.players, packet.src);
      if (player && player.name) {
        appendMessageToChat(packet, player.name);
      }
    }
  });
}

export const destroyChatEvents = () => {
  $('#chat-input-submit').off('click');
  $('#chat-input').off('click');
}

export const createMessage = (src, message) => {
  return {
    src : src,
    time : new Date().getTime(),
    message : message
  };
}

export const submitMessage = (peer, name) => {
  const chatInput = $('#chat-input');
  const message = chatInput.val()

  if (message && message !== '') {
    const msg = createMessage(peer.id, message);
    peer.broadcast('chat', msg);
    appendMessageToChat(msg, name);
    chatInput.val('');
  }
}

export const appendMessageToChat = (msg, name) => {
  const date = new Date(msg.time);

  const messageBox = $('#chat-message-box');

  messageBox.append(
    $(`<p>[${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}] ${name}: ${msg.message}</p>`).css({
      padding : 0,
      margin : 0
    })
  );

  // scroll to bottom
  messageBox.animate({
    scrollTop: 999999999999 // definitely not a hack :)
  }, 0);
}
