var canvas = document.getElementById("paintingCanvas");
var ctx = canvas.getContext("2d");
var image = { element: document.getElementById("paintingImage") };

var width = 500; // TODO: Replace with ctx parameter.

// Gets mouse coordinates on canvas.
function getMousePos(e) {
	var rect = canvas.getBoundingClientRect();
	return {
		x: e.clientX - rect.left,
		y: e.clientY - rect.top
	};
}

function Point(other = { x: 0, y: 0 }) {
	this.x = other.x;
	this.y = other.y;
	this.getDistance = function (other) {
		return Math.sqrt(Math.pow(other.x - this.x, 2) + Math.pow(other.y - this.y, 2));
	}
	this.getDistanceXY = function (other) {
		return { x: other.x - this.x, y: other.y - this.y };
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
	var mousePos = getMousePos(e);
	if (mouseLastPos != null && mouseDrag) {
		
		pos.move(mouseLastPos.getDistanceXY(mousePos)); // Moves the global transformation by the distance between last mouse pos and current mouse pos.
		draw();
	}
	mouseLastPos = new Point(mousePos);
});
canvas.addEventListener("mousedown", function (e) {
	var mousePos = getMousePos(e);
	mouseLastPos = new Point(mousePos);
	mouseStartPos = new Point(mousePos);
	mouseDrag = true;
});
canvas.addEventListener("mouseup", function (e) {
	if (mouseStartPos != null && mouseStartPos.getDistance(getMousePos(e)) <= 10) {
		var imagePoint = mouseStartPos.toScale();
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
canvas.addEventListener("wheel", function (e) {
	pos.zoom(e.deltaY);
	draw();
});

// Touchscreen dragging support.
var touchDrag = false;
var touchX = 0;
var touchY = 0;
function handleTouch(e) {
	touchDrag = e.touches.length == 1;
	if (touchDrag) {
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
