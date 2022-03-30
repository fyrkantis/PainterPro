var canvas = document.getElementById("paintingCanvas");
var ctx = canvas.getContext("2d");

var width = 500; // TODO: Replace with ctx parameter.

var image = document.getElementById("paintingImage");
var imageX = 0.5;
var imageY = 0.5;
var imageWidth = width;
var imageHeight = width;
var imageZoom = 1;

// Re-draws everything on the canvas.
function draw() {
	ctx.clearRect(0, 0, width, width);
	imageWidth = image.width * imageZoom;
	imageHeight = image.height * imageZoom;
	ctx.drawImage(image, Math.floor(imageX * width - imageWidth / 2), Math.floor(imageY * width - imageHeight / 2), imageWidth, imageHeight);

	// Makes the individual pixels more clear.
	// https://stackoverflow.com/a/19129822/13347795
	ctx.imageSmoothingEnabled = false;
	ctx.msImageSmoothingEnabled = false;
	ctx.mozImageSmoothingEnabled = false;
	ctx.webkitImageSmoothingEnabled = false;
}

// Handles dragging.

// Prevents page scrolling when over canvas.
canvas.onwheel = function (e) {
	e.preventDefault();
};
canvas.ontouchmove = function (e) {
	e.preventDefault();
};

// Mouse dragging support.
var mouseDrag = false;
var mouseX = 0;
var mouseY = 0;
canvas.addEventListener("mousemove", function (e) {
	if (mouseDrag) {
		imageX += (e.x - mouseX) / width;
		imageY += (e.y - mouseY) / width;
		draw();
	}
	mouseX = e.x;
	mouseY = e.y;
});
canvas.addEventListener("mousedown", function (e) {
	mouseX = e.x;
	mouseY = e.y;
	mouseDrag = true
});
canvas.addEventListener("mouseup", function (e) {
	mouseDrag = false
});
canvas.addEventListener("mouseleave", function (e) {
	mouseDrag = false
});
canvas.addEventListener("wheel", function (e) {
	if (e.deltaY > 0) {
		imageZoom /= 2;
	} else if (e.deltaY < 0) {
		imageZoom *= 2;
	}
	draw();
});

// Touchscreen dragging support.
var touchDrag = false;
var touchX = 0;
var touchY = 0;
function handleTouch(e) {
	touchDrag = e.touches.length == 1;
	if (touchDrag) {
		console.log(e.touches[0]);
		imageX += (e.touches[0].clientX - touchX) / width;
		imageY += (e.touches[0].clientY - touchY) / width;
		touchX = e.touches[0].clientX;
		touchY = e.touches[0].clientY;
		draw();
	}
}
canvas.addEventListener("touchmove", handleTouch);
canvas.addEventListener("touchstart", function (e) {
	touchDrag = e.touches.length == 1;
	if (touchDrag) {
		touchX = e.touches[0].clientX;
		touchY = e.touches[0].clientY;
	}
});
canvas.addEventListener("touchend", handleTouch);
canvas.addEventListener("touchcancel", handleTouch);

canvas.addEventListener("gesturechange", function (e) {
	imageZoom = e.scale; // Currently untested.
});

// Point selection.
/*canvas.addEventListener("click", function (e) {
	console.log(e);
});*/

// Resizing support.

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
window.addEventListener("resize", resize);
