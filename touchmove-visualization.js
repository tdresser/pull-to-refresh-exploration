var canvas;
var context;
var canvasScale = 2;
var scrollBase;
var x = 0;
var neverSeenTouchMove = true;
var overscrollHandler;
var lastScrollPosition = 0;


function drawLine(x0, y0, x1, y1, color) {
  context.strokeStyle=color;
  context.beginPath();
  context.moveTo(Math.round(x0), Math.round(y0));
  context.lineTo(Math.round(x1), Math.round(y1));
  context.stroke();
  context.closePath();
}

function onPositionUpdate(time, position) {
  var scrollPosition = overscrollHandler.getScrollPosition();
  drawLine(x, scrollBase, x, scrollBase + scrollPosition, '#0f0');
  //drawLine(x, scrollBase, x, scrollBase + overscrollHandler.getTouchPosition(), '#f00');
  drawLine(x, scrollBase, x, scrollBase + position, '#00f');

  if (scrollPosition === 0 && lastScrollPosition !== 0) {
    drawLine(x, 0, x, canvas.height, '#99f');
  }
  lastScrollPosition = scrollPosition;
  movesSeen = 0;
  scrollsSeen = 0;
  if (!neverSeenTouchMove) {
    x+=2;
  }
}

document.addEventListener("keydown", function(e) {
  if (e.keyCode !== 27) {
    return;
  }
  context.clearRect(-0.5, -0.5, canvas.width, canvas.height);
  document.body.scrollTop = 0;

  x = 0;
  neverSeenTouchMove = true;
  overscrollHandler.reset();
  lastScrollPosition = 0;
});

document.addEventListener("touchmove", function(e) {
  neverSeenTouchMove = false;
});

window.addEventListener('load', function() {
  // Canvas Setup
  canvas = document.getElementById("canvas");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  context = canvas.getContext('2d');
  context.imageSmoothingEnabled = false;
  context.globalCompositeOperation = "multiply";
  context.translate(0.5, 0.5);
  context.lineWidth = 1;
  context.scale(canvasScale, canvasScale);
  // Drawing app
  scrollBase = canvas.height / 2 / canvasScale;
  overscrollHandler = new OverscrollHandler(document.body, document, onPositionUpdate);
}, false);
