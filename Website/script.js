var canvas = document.getElementById("paintingCanvas");
var ctx = canvas.getContext("2d");
var image = { element: document.getElementById("paintingImage") };
var template = document.getElementById("selectedPixelTemplate");
var holder = document.getElementById("selectedPixelsHolder");
var submitButton = document.getElementById("submitButton");

const zoomMax = Math.pow(2, 6);
const zoomMin = Math.pow(2, -2);

function rgbListToHex(rgb) {
	return ((rgb[0] << 16) | (rgb[1] << 8) | rgb[2]).toString(16);
}

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
	scale: 2,
	move: function (distance) {
		this.x += distance.x / canvas.clientWidth;
		this.y += distance.y / canvas.clientHeight;
	},
	zoom: function (amount) {
		let factor = Math.pow(0.5, amount / 150);

		// Clamps zoom.
		if (this.scale * factor > zoomMax) {
			console.log("Max zoom reached.");
			factor = zoomMax / this.scale;
		} else if (this.scale * factor < zoomMin) {
			console.log("Min zoom reached.");
			factor = zoomMin / this.scale;
		}
		this.scale *= factor;

		if (mouseLastPos != null) {
			
			// https://stackoverflow.com/a/30039971/13347795
			this.x = (image.pos.x - (mouseLastPos.x - image.pos.x - image.size.x / 2) * (factor - 1) + image.size.x / 2) / canvas.clientWidth;
			this.y = (image.pos.y - (mouseLastPos.y - image.pos.y - image.size.x / 2) * (factor - 1) + image.size.y / 2) / canvas.clientHeight;
		} else {
			console.log("No mouse position to scroll from.");
		}
	}
};

var points = [];
function elementIndex(elem) {
	var i = 0;
	while ((elem = elem.previousElementSibling) != null) ++i;
	return i;
}

// Re-draws everything on the canvas.
function draw() {
	// Makes the individual pixels more clear.
	// https://stackoverflow.com/a/19129822/13347795
	ctx.imageSmoothingEnabled = false;
	ctx.msImageSmoothingEnabled = false;
	ctx.mozImageSmoothingEnabled = false;
	ctx.webkitImageSmoothingEnabled = false;

	ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);

	image.size = { x: image.element.width * globalPos.scale, y: image.element.height * globalPos.scale }
	image.pos = { x: globalPos.x * canvas.clientWidth - image.size.x / 2, y: globalPos.y * canvas.clientHeight - image.size.y / 2 }

	ctx.drawImage(image.element, image.pos.x, image.pos.y, image.size.x, image.size.y);

	ctx.fillStyle = "#ff0000";
	points.forEach(function (point) {
		ctx.fillRect(image.pos.x + point.pos.x * globalPos.scale, image.pos.y + point.pos.y * globalPos.scale, globalPos.scale, globalPos.scale);
	});
}

function movePixel(e) {
	let value = parseInt(this.value);
	let point = points[elementIndex(this.parentElement)];
	
	if (this.name == "x") {
		if (value < 0 || value >= image.element.width) {
			console.log("Can't move out of bounds.");
			this.value = point.pos.x;
		} else if (points.filter(function (element) {
			return element.pos.x == value && element.pos.y == point.pos.y;
		}).length > 0) {
			console.log("Can't move into another point.");
			this.value = point.pos.x;
		} else {
			point.pos.x = value;
		}
	} else if (this.name == "y") {
		if (value < 0 || value >= image.element.height) {
			console.log("Can't move out of bounds.");
			this.value = point.pos.y;
		} else if (points.filter(function (element) {
			return element.pos.x == point.pos.x && element.pos.y == value;
		}).length > 0) {
			console.log("Can't move into another point.");
			this.value = point.pos.y;
		} else {
			point.pos.y = value;
		}
	}

	draw();
}

function colorPixel(e) {
	
	draw()
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
			return element.pos.x == mouseImagePos.x && element.pos.y == mouseImagePos.y;
		}).length > 0) {
			console.log("Point already exists.");
		}
		else if (mouseImagePos.x >= 0 && mouseImagePos.y >= 0 && mouseImagePos.x < image.element.width && mouseImagePos.y < image.element.height) {
			let point = new Point(mouseImagePos)
			points.push(point);
			let copy = template.cloneNode(true);
			copy.querySelector("h3").innerHTML = "Point " + points.length;
			let x = copy.querySelector("input[name=x]");
			x.value = point.pos.x;
			x.max = image.element.width - 1;
			x.addEventListener("change", movePixel);

			let y = copy.querySelector("input[name=y]");
			y.value = point.pos.y;
			y.max = image.element.height - 1;
			y.addEventListener("change", movePixel);

			let color = copy.querySelector("input[type=color]");
			// Gets the current color of the pixel.
			// https://stackoverflow.com/a/6736135/13347795
			color.value = "#" + ("000000" + rgbListToHex(ctx.getImageData(mouseStartPos.x, mouseStartPos.y, 1, 1).data)).slice(-6);
			color.addEventListener("input", colorPixel);

			copy.style = "";
			holder.appendChild(copy); // TODO: Scroll when pixel is added.
			submitButton.value = "Change " + points.length + " pixels for " + points.length * 3 + "kr";
			submitButton.disabled = points.length <= 0;
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
	let rect = holder.getBoundingClientRect()
	let style = getComputedStyle(holder);

	// Calculates the width that should be taken by canvas: the holders width - padding - 4 pixels for the canvas border.
	let width = Math.floor(rect.width - parseFloat(style.getPropertyValue("padding-left")) - parseFloat(style.getPropertyValue("padding-right")) - 4);
	let height = Math.floor(rect.height - parseFloat(style.getPropertyValue("padding-top")) - parseFloat(style.getPropertyValue("padding-bottom")) - 4);
	canvas.width = width;
	canvas.height = height;
	draw();
}
resize();
window.addEventListener("resize", resize);
