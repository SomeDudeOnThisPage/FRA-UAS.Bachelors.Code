/*
 * Utility methods to manage the chat box...
 */

export const setupChatEvents = (localPeer, playerMeta) => {
  // create default event handlers
  $('#chat-input-submit').click(() => {
    // submit message with our local players' name
    submitMessage(localPeer, playerMeta.getPlayerByPeerId(localPeer.id).name);
  });

  $('#chat-input').keypress((e) => {
    if (e.which === 13) { // ENTER
      // submit message with our local players' name
      submitMessage(localPeer, playerMeta.getPlayerByPeerId(localPeer.id).name);
    }
  });

  // handle local peer chat event
  localPeer.on('chat', (packet) => {
    if (packet && packet.src) {
      // chat messages are sent over WebRTC data channels, so packet.src is a peerId
      const meta = playerMeta.getPlayerByPeerId(packet.src);
      if (meta && meta.name) {
        appendMessageToChat(packet, meta.name);
      }
    }
  });
}

export const destroyChatEvents = () => {
  $('#chat-input-submit').off('click');
  $('#chat-input').off('click');
}

/**
 * Utility method for creating a generic message-object.
 * @param src
 * @param message
 * @returns {{from, time: number, message}}
 */
export const createMessage = (src, message) => {
  return {
    src : src,
    time : new Date().getTime(),
    message : message
  };
}

/**
 * Submits a message, this message will be sent to all other peers, as well as be added to our local chatbox.
 * @param localPeer
 * @param name
 */
export const submitMessage = (localPeer, name) => {
  const chatInput = $('#chat-input');
  const message = chatInput.val()

  if (message && message !== '') {

    // create message
    const msg = createMessage(localPeer.id, message);

    // broadcast message to peers
    localPeer.broadcast('chat', msg);

    // append message to our own local chatbox
    appendMessageToChat(msg, name);

    // clear input
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