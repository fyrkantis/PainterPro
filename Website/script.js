var canvas = document.getElementById("paintingCanvas");
var ctx = canvas.getContext("2d");
var image = { element: document.getElementById("paintingImage") };

var width = 500; // TODO: Replace with ctx parameter.

// Gets mouse coordinates on canvas.
function getCanvasPos(point) {
	let rect = canvas.getBoundingClientRect();
	return { x: point.x - rect.left, y: point.y - rect.top };
}
function getEventCanvasPos(e) {
	return getCanvasPos({ x: e.clientX, y: e.clientY })
}

function Position(point) {
	this.x = point.x;
	this.y = point.y;
	this.getDistance = function (point) {
		return Math.sqrt(Math.pow(point.x - this.x, 2) + Math.pow(point.y - this.y, 2));
	}
	this.getEventDistance = function (e) {
		return this.getDistance({ x: e.clientX, y: e.clientY });
	},
	this.getDistanceXY = function (point) {
		return { x: point.x - this.x, y: point.y - this.y };
	},
	this.getEventDistanceXY = function (e) {
		return this.getDistanceXY({ x: e.clientX, y: e.clientY });
	},
	this.toScale = function () {
		return { x: Math.floor((this.x - image.pos.x) / pos.scale), y: Math.floor((this.y - image.pos.y) / pos.scale) };
	}
}
function EventPosition(e) {
	return Position({ x: e.clientX, y: e.clientY });
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
	let canvasPos = getEventCanvasPos(e);
	if (mouseLastPos != null && mouseDrag) {
		pos.move(mouseLastPos.getDistanceXY(canvasPos)); // Moves the global transformation by the distance between last mouse pos and current mouse pos.
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
	mouseStartPos = null;
	mouseDrag = false
});
canvas.addEventListener("mouseleave", function (e) {
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
		let canvasPos = getEventCanvasPos(e.touches[0])
		pos.move(touchLastPos.getDistanceXY(canvasPos));
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
