var canvas = document.getElementById("paintingCanvas");
var ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

var width = 500;

var image = document.getElementById("paintingImage");
var imageX = 0;
var imageY = 0;

// Re-draws everything on the canvas.
function draw() {
	ctx.clearRect(0, 0, width, width);
	ctx.drawImage(image, imageX, imageY); // TODO: Use ImageData instead.
}

// Handles mouse dragging.
var mouseX = 0;
var mouseY = 0;
var mouseDrag = false;

function moveMouse(event) {
	if (mouseDrag) {
		imageX += event.offsetX - mouseX;
		imageY += event.offsetY - mouseY;
		mouseX = event.offsetX;
		mouseY = event.offsetY;
	}
	draw();
}

canvas.addEventListener("mousedown", function (event) {
	mouseDrag = true;
	mouseX = event.offsetX;
	mouseY = event.offsetY;
});

canvas.addEventListener("mousemove", moveMouse);
canvas.onwheel = function (event) {
	event.preventDefault(); // Prevents scrolling when over canvas.
};

canvas.addEventListener("mouseup", function () {
	mouseDrag = false;
});

canvas.addEventListener("mouseleave", function () {
	mouseDrag = false
});

// Resizes the canvas when the window is resized.
function resize() {
	let holder = canvas.parentElement;
	let style = getComputedStyle(holder);

	// Calculates the width that should be taken by canvas: the holders width - padding - 4 pixels for the canvas border.
	width = Math.floor(holder.getBoundingClientRect().width - parseFloat(style.getPropertyValue("padding-left")) - parseFloat(style.getPropertyValue("padding-right")) - 4);
	canvas.width = width;
	canvas.height = width;
	draw();
}

resize();
window.onresize = resize;