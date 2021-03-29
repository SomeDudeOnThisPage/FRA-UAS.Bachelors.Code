$(document).on('DOMContentLoaded', () => {
  const socket = io('http://localhost:1234');

  $('#create-lobby-submit').click(() => {
    socket.emit('game-room-create', 'test');
  });

  $('#join-lobby-submit').click(() => {
    window.location.href = `/game/${$('#join-lobby-name').val()}/`;
  });

  socket.on('game-room-created', (id) => {
    window.location.href = `/game/${id}/`;
  });
});
