// Gantry target coordinates handling

// SocketIO
var socket = io();
socket.on('connect', function() {
  socket.emit('my event', {data: 'I\'m connected!'});
});
socket.on('my response', function(data) {
  console.log(data);
});

// Box
var theThing = document.querySelector("#thing");
var container = document.querySelector("#contentContainer");

container.addEventListener("click", getClickPosition, false);

function getClickPosition(e) {
    var parentPosition = getPosition(e.currentTarget);
    var xPosition = e.clientX - parentPosition.x - (theThing.clientWidth / 2);
    var yPosition = e.clientY - parentPosition.y - (theThing.clientHeight / 2);

    theThing.style.left = xPosition + "px";
    theThing.style.top = yPosition + "px";
    socket.emit('coordinates', {data: {'x': xPosition, 'y': yPosition}})
}

// Helper function to get an element's exact position
function getPosition(el) {
  var xPos = 0;
  var yPos = 0;

  while (el) {
    if (el.tagName == "BODY") {
      // deal with browser quirks with body/window/document and page scroll
      var xScroll = el.scrollLeft || document.documentElement.scrollLeft;
      var yScroll = el.scrollTop || document.documentElement.scrollTop;

      xPos += (el.offsetLeft - xScroll + el.clientLeft);
      yPos += (el.offsetTop - yScroll + el.clientTop);
    } else {
      // for all other non-BODY elements
      xPos += (el.offsetLeft - el.scrollLeft + el.clientLeft);
      yPos += (el.offsetTop - el.scrollTop + el.clientTop);
    }

    el = el.offsetParent;
  }
  return {
    x: xPos,
    y: yPos
  };
}

// Functions to communicate knob control to backend
function knob_clockwise() {
  knob_unified("+1")
}
function knob_press() {
  knob_unified("X")
}
function knob_counterclockwise() {
  knob_unified("-1")
}
function knob_unified(msg) {
  socket.emit('knob', {data: msg});
}
