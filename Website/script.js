var canvas = document.getElementById("paintingCanvas");
var ctx = canvas.getContext("2d");
var image = { element: document.getElementById("paintingImage") };

var width = 500; // TODO: Replace with ctx parameter.

// Gets mouse coordinates on canvas.
function getCanvasPos(e) {
	let rect = canvas.getBoundingClientRect();
	return { clientX: e.clientX - rect.left, clientY: e.clientY - rect.top };
}

function Point(other) {
	this.x = other.clientX;
	this.y = other.clientY;
	this.getDistance = function (other) {
		return Math.sqrt(Math.pow(other.clientX - this.x, 2) + Math.pow(other.clientY - this.y, 2));
	}
	this.getDistanceXY = function (other) {
		return { x: other.clientX - this.x, y: other.clientY - this.y };
	},
	this.toScale = function () {
		return { x: Math.floor((this.x - image.pos.x) / pos.scale), y: Math.floor((this.y - image.pos.y) / pos.scale) };
	}
}

// The global transformation of everything.
var pos = {
	x: 0.5,
	y: 0.5,
	scale: 1,
	move: function (distance) {
		this.x += distance.x / width;
		this.y += distance.y / width;
	},
	zoom: function (amount) {
		if (amount > 0) {
			this.scale /= 2;
		} else if (amount < 0) {
			this.scale *= 2;
		}
	}
};

var points = [];

// Re-draws everything on the canvas.
function draw() {
	ctx.clearRect(0, 0, width, width);

	image.size = { x: image.element.width * pos.scale, y: image.element.height * pos.scale }
	image.pos = { x: pos.x * width - image.size.x / 2, y: pos.y * width - image.size.y / 2 }

	ctx.drawImage(image.element, image.pos.x, image.pos.y, image.size.x, image.size.y);

	ctx.fillStyle = "#ff0000";
	points.forEach(function (value) {
		ctx.fillRect(image.pos.x + value.x * pos.scale, image.pos.y + value.y * pos.scale, pos.scale, pos.scale);
	});

	// Makes the individual pixels more clear.
	// https://stackoverflow.com/a/19129822/13347795
	ctx.imageSmoothingEnabled = false;
	ctx.msImageSmoothingEnabled = false;
	ctx.mozImageSmoothingEnabled = false;
	ctx.webkitImageSmoothingEnabled = false;
}

// Prevents page scrolling when over canvas.
canvas.onwheel = function (e) {
	e.preventDefault();
};
canvas.ontouchmove = function (e) {
	e.preventDefault();
};

// Mouse support.
var mouseDrag = false;
var mouseLastPos;
var mouseStartPos;
canvas.addEventListener("mousemove", function (e) {
	let canvasPos = getCanvasPos(e);
	if (mouseLastPos != null && mouseDrag) {
		pos.move(mouseLastPos.getDistanceXY(canvasPos)); // Moves the global transformation by the distance between last mouse pos and current mouse pos.
		draw();
	}
	mouseLastPos = new Point(canvasPos);
});
canvas.addEventListener("mousedown", function (e) {
	let canvasPos = getCanvasPos(e);
	mouseLastPos = new Point(canvasPos);
	mouseStartPos = new Point(canvasPos);
	mouseDrag = true;
});
canvas.addEventListener("mouseup", function (e) {
	if (mouseStartPos != null && mouseStartPos.getDistance(getCanvasPos(e)) <= 10) {
		let imagePoint = mouseStartPos.toScale();
		if (points.filter(function (element) {
			return element.x == imagePoint.x && element.y == imagePoint.y;
		}).length > 0) {
			console.log("Point already exists.");
		}
		else if (imagePoint.x >= 0 && imagePoint.y >= 0 && imagePoint.x < image.element.width && imagePoint.y < image.element.height) {
			points.push(imagePoint);
			draw();
		} else {
			console.log("Point out of bounds.");
		}
	}
	mouseLastPos = null
	mouseStartPos = null;
	mouseDrag = false
});
canvas.addEventListener("mouseleave", function (e) {
	mouseLastPos = null
	mouseStartPos = null;
	mouseDrag = false
});
canvas.addEventListener("wheel", function (e) { // TODO: Reposition image so that mouse is at center of zoom.
	pos.zoom(e.deltaY);
	draw();
});

// Touchscreen dragging support.
var touchDrag = false;
var touchLastPos;
function handleTouch(e) {
	touchDrag = e.touches.length == 1;
	if (touchDrag) {
		pos.move(touchLastPos.getDistanceXY(getCanvasPos(e.touches[0])));
		draw();
		touchLastPos = new Point(getCanvasPos(e.touches[0]));
	} else {
		touchLastPos = null;
	}
	
}
canvas.addEventListener("touchmove", handleTouch);
canvas.addEventListener("touchstart", function (e) {
	touchDrag = e.touches.length == 1;
	if (touchDrag) {
		touchLastPos = new Point(getCanvasPos(e.touches[0]));
	} else {
		touchLastPos = null;
	}
});
canvas.addEventListener("touchend", handleTouch);
canvas.addEventListener("touchcancel", handleTouch);

canvas.addEventListener("gesturechange", function (e) {
	pos.scale = e.scale; // Currently untested.
});

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
