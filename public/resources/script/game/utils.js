const STYLE_OVERLAY = {
  'position' : 'absolute',
  'width' : '100%',
  'height' : '33.3%',
  'top' : '33.3%',
  'left' : '0%',
  'background-color' : 'white',
  'display' : 'none'
};

export const overlay = (text, onclick) => {
  const overlay = $('<div>')
    .css(STYLE_OVERLAY)
    .text(text);
  overlay.click(() => {
    overlay.remove();
    return onclick();
  });

  $('#maedn').append(overlay);
  overlay.fadeIn();
}