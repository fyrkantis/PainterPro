var canvas = document.getElementById("paintingCanvas");
var ctx = canvas.getContext("2d");
var image = { element: document.getElementById("paintingImage") };

var width = 500; // TODO: Replace with ctx parameter.

// Gets mouse coordinates on canvas.
function getCanvasPos(pos) {
	let rect = canvas.getBoundingClientRect();
	return { x: pos.x - rect.left, y: pos.y - rect.top };
}
function getEventCanvasPos(e) {
	return getCanvasPos({ x: e.clientX, y: e.clientY })
}

function Position(pos) {
	this.x = pos.x;
	this.y = pos.y;
	this.getDistance = function (pos) {
		return Math.sqrt(Math.pow(pos.x - this.x, 2) + Math.pow(pos.y - this.y, 2));
	}
	this.getEventDistance = function (e) {
		return this.getDistance({ x: e.clientX, y: e.clientY });
	},
	this.getDistanceXY = function (pos) {
		return { x: pos.x - this.x, y: pos.y - this.y };
	},
	this.getEventDistanceXY = function (e) {
		return this.getDistanceXY({ x: e.clientX, y: e.clientY });
	},
	this.toImageScale = function () {
		return { x: Math.floor((this.x - image.pos.x) / globalPos.scale), y: Math.floor((this.y - image.pos.y) / globalPos.scale) };
	}
}
function EventPosition(e) {
	return Position({ x: e.clientX, y: e.clientY });
}

function Point(pos, color) {
	this.pos = pos;
	this.color = color;
}

// The global transformation of everything.
var globalPos = {
	x: 0.5,
	y: 0.5,
	scale: 1,
	move: function (distance) {
		this.x += distance.x / width;
		this.y += distance.y / width;
	},
	zoom: function (amount) {
		let factor = 1;
		if (amount > 0) {
			factor /= 2;
		} else if (amount < 0) {
			factor *= 2;
		}
		this.scale *= factor;
		if (mouseLastPos != null) {
			
			// https://stackoverflow.com/a/30039971/13347795
			this.x = (image.pos.x - (mouseLastPos.x - image.pos.x - image.size.x / 2) * (factor - 1) + image.size.x / 2) / width;
			this.y = (image.pos.y - (mouseLastPos.y - image.pos.y - image.size.x / 2) * (factor - 1) + image.size.y / 2) / width;
		} else {
			console.log("No mouse position to scroll from.");
		}
	}
};

var points = [];

// Re-draws everything on the canvas.
function draw() {
	ctx.clearRect(0, 0, width, width);

	image.size = { x: image.element.width * globalPos.scale, y: image.element.height * globalPos.scale }
	image.pos = { x: globalPos.x * width - image.size.x / 2, y: globalPos.y * width - image.size.y / 2 }

	ctx.drawImage(image.element, image.pos.x, image.pos.y, image.size.x, image.size.y);

	ctx.fillStyle = "#ff0000";
	points.forEach(function (point) {
		ctx.fillRect(image.pos.x + point.pos.x * globalPos.scale, image.pos.y + point.pos.y * globalPos.scale, globalPos.scale, globalPos.scale);
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
	let canvasPos = getEventCanvasPos(e);
	if (mouseLastPos != null && mouseDrag) {
		globalPos.move(mouseLastPos.getDistanceXY(canvasPos)); // Moves the global transformation by the distance between last mouse pos and current mouse pos.
		draw();
	}
	mouseLastPos = new Position(canvasPos);
});
canvas.addEventListener("mousedown", function (e) {
	let canvasPos = getEventCanvasPos(e);
	mouseLastPos = new Position(canvasPos);
	mouseStartPos = new Position(canvasPos);
	mouseDrag = true;
});
canvas.addEventListener("mouseup", function (e) {
	if (mouseStartPos != null && mouseStartPos.getDistance(getEventCanvasPos(e)) <= 10) {
		let mouseImagePos = mouseStartPos.toImageScale(); // Converts mouse position to a pixel on the image.
		if (points.filter(function (element) {
			return element.x == mouseImagePos.x && element.y == mouseImagePos.y;
		}).length > 0) {
			console.log("Point already exists.");
		}
		else if (mouseImagePos.x >= 0 && mouseImagePos.y >= 0 && mouseImagePos.x < image.element.width && mouseImagePos.y < image.element.height) {
			points.push(new Point(mouseImagePos));
			draw();
		} else {
			console.log("Point out of bounds.");
		}
	}
	mouseStartPos = null;
	mouseDrag = false
});
canvas.addEventListener("mouseleave", function (e) {
	mouseStartPos = null;
	mouseDrag = false
});
canvas.addEventListener("wheel", function (e) { // TODO: Reposition image so that mouse is at center of zoom.
	globalPos.zoom(e.deltaY);
	draw();
});

// Touchscreen dragging support.
var touchDrag = false;
var touchLastPos;
function handleTouch(e) {
	touchDrag = e.touches.length == 1;
	if (touchDrag) {
		let canvasPos = getEventCanvasPos(e.touches[0])
		globalPos.move(touchLastPos.getDistanceXY(canvasPos));
		draw();
		touchLastPos = new Position(canvasPos);
	} else {
		touchLastPos = null;
	}
	
}
canvas.addEventListener("touchmove", handleTouch);
canvas.addEventListener("touchstart", function (e) {
	touchDrag = e.touches.length == 1;
	if (touchDrag) {
		touchLastPos = new Position(getEventCanvasPos(e.touches[0]));
	} else {
		touchLastPos = null;
	}
});
canvas.addEventListener("touchend", handleTouch);
canvas.addEventListener("touchcancel", handleTouch);

canvas.addEventListener("gesturechange", function (e) {
	globalPos.scale = e.scale; // Currently untested.
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
