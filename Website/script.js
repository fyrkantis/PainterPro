var canvas = document.getElementById("paintingCanvas");
var ctx = canvas.getContext("2d");
var image = { element: document.getElementById("paintingImage") };
var template = document.getElementById("selectedPixelTemplate");
var holder = document.getElementById("selectedPixelsHolder");
var submitButton = document.getElementById("submitButton");
var showCheckbox = document.getElementById("show");

const zoomMax = Math.pow(2, 8);
const zoomMin = Math.pow(2, -2);
const fontSize = 12;
const fontPadding = 2;

var colorOptions = document.getElementById("colors").getElementsByTagName("option");
var colors = [];
for (let i = 0; i < colorOptions.length; i++) {
	colors.push(colorOptions[i].value)
}

var picker;
function Picker(index) {
	this.margin = { x: 10, y: 10 };
	this.rowLength = 3;
	this.box = {
		size: { x: 20, y: 20 },
		distance: { x: 5, y: 5 }
	};
	this.length = {
		x: Math.min(colors.length, this.rowLength),
		y: Math.floor(colors.length / this.rowLength)
	};
	this.size = {
		x: this.margin.x * 2 + this.box.size.x * this.length.x + this.box.distance.x * (this.length.x - 1),
		y: this.margin.y * 2 + this.box.size.y * this.length.y + this.box.distance.y * (this.length.y - 1)
	};

	let pixel = getPixel(index);
	this.pos = {
		x: image.pos.x + pixel.pos.x * globalPos.scale,
		y: image.pos.y + pixel.pos.y * globalPos.scale
	};
	if (this.pos.x < canvas.width / 2) { this.pos.x += globalPos.scale; }
	else { this.pos.x -= this.size.x; }
	if (this.pos.y > canvas.height / 2) { this.pos.y -= this.size.y - globalPos.scale; }

	this.getBox = function (boxIndex) {
		let xIndex = boxIndex % this.rowLength;
		let yIndex = Math.floor(boxIndex / this.rowLength);
		return {
			x: this.pos.x + this.margin.x + this.box.size.x * xIndex + this.box.distance.x * xIndex,
			y: this.pos.y + this.margin.y + this.box.size.y * yIndex + this.box.distance.y * yIndex
		};
	};
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

var pixels = [];
var pixelIndex = 0;
var selectedIndex = null;
function Pixel(pos) {
	this.index = pixelIndex;
	pixelIndex++;

	this.pos = pos;
	this.color = null;
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

// Re-draws everything on the canvas.
function draw() {
	ctx.font = fontSize + "px Arial";
	ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);

	image.size = { x: image.element.width * globalPos.scale, y: image.element.height * globalPos.scale }
	image.pos = { x: globalPos.x * canvas.clientWidth - image.size.x / 2, y: globalPos.y * canvas.clientHeight - image.size.y / 2 }

	ctx.drawImage(image.element, image.pos.x, image.pos.y, image.size.x, image.size.y);

	ctx.textAlign = "start";
	ctx.textBaseline = "top";

	// Draws pixels.
	pixels.forEach(function (pixel) {
		let x = image.pos.x + pixel.pos.x * globalPos.scale;
		let y = image.pos.y + pixel.pos.y * globalPos.scale;

		let color = getPickerColor(mouseLastPos);
		if (pixel.color != null && !(pixel.index == selectedIndex && color != null)) {
			ctx.fillStyle = pixel.color;
			ctx.fillRect(x, y, globalPos.scale, globalPos.scale);
		} else if (color != null) {
			ctx.fillStyle = color;
			ctx.fillRect(x, y, globalPos.scale, globalPos.scale);
		}
	});

	if (showCheckbox.checked) {
		// Draws pixel frames.
		pixels.forEach(function (pixel) {
			let x = image.pos.x + pixel.pos.x * globalPos.scale;
			let y = image.pos.y + pixel.pos.y * globalPos.scale;
			let frameWidth = 2;
			if (pixel.index == selectedIndex) {
				frameWidth = 5;
			}

			ctx.fillStyle = "#000000";
			ctx.beginPath();
			ctx.moveTo(x + globalPos.scale, y);
			ctx.lineTo(x + globalPos.scale - frameWidth, y + frameWidth);
			ctx.lineTo(x + globalPos.scale - frameWidth, y + globalPos.scale - frameWidth);
			ctx.lineTo(x + frameWidth, y + globalPos.scale - frameWidth);
			ctx.lineTo(x, y + globalPos.scale);
			ctx.lineTo(x + globalPos.scale, y + globalPos.scale);
			ctx.fill();

			ctx.fillStyle = "#aaaaaa";
			ctx.beginPath()
			ctx.moveTo(x, y + globalPos.scale);
			ctx.lineTo(x + frameWidth, y + globalPos.scale - frameWidth);
			ctx.lineTo(x + frameWidth, y + frameWidth);
			ctx.lineTo(x + globalPos.scale - frameWidth, y + frameWidth);
			ctx.lineTo(x + globalPos.scale, y);
			ctx.lineTo(x, y);
			ctx.fill();

			// Draws pixel index.
			ctx.strokeStyle = "#000000";
			ctx.fillStyle = "#ffffff";
			ctx.lineWidth = 4;
			if (globalPos.scale >= fontSize + fontPadding * 2) {
				ctx.strokeText(pixel.index, x + fontPadding, y + fontPadding);
				ctx.fillText(pixel.index, x + fontPadding, y + fontPadding);
			}
		});
	}

	// Draws color picker.
	if (selectedIndex != null) {
		picker = new Picker(selectedIndex);
		if (picker != null) {
			ctx.lineWidth = 3;
			ctx.strokeStyle = "#000000";
			ctx.strokeRect(picker.pos.x, picker.pos.y, picker.size.x, picker.size.y);
			ctx.fillRect(picker.pos.x, picker.pos.y, picker.size.x, picker.size.y);

			colors.forEach(function (color, index) {
				ctx.fillStyle = color;
				let box = picker.getBox(index)
				ctx.strokeRect(box.x, box.y, picker.box.size.x, picker.box.size.y);
				ctx.fillRect(box.x, box.y, picker.box.size.x, picker.box.size.y);
			});
		}
	} else {
		picker = null;
	}

	ctx.textAlign = "end";
	ctx.textBaseline = "bottom";
	ctx.lineWidth = 4;
	let text;
	if (mouseLastPos != null) {
		let mouseImagePos = mouseLastPos.toImageScale(); // Converts mouse position to a pixel on the image.
		text = "X: " + mouseImagePos.x + ", Y: " + mouseImagePos.y;
	} else {
		text = "X: ?, Y: ?"
	}
	ctx.strokeStyle = "#000000";
	ctx.fillStyle = "#ffffff";
	ctx.strokeText(text, canvas.width, canvas.height);
	ctx.fillText(text, canvas.width, canvas.height);
}

function getPickerColor(pos) {
	let returnColor;
	if (selectedIndex != null && picker != null) {
		colors.forEach(function (color, index) {
			let box = picker.getBox(index);
			if (pos.x > box.x && pos.x < box.x + picker.box.size.x && pos.y > box.y && pos.y < box.y + picker.box.size.y) {
				returnColor = color;
				return;
			}
		});
	}
	return returnColor;
}

function getPixel(index) {
	return pixels.filter(function (element) { return element.index == index; })[0]
}

function movePixel(e) {
	let index = parseInt(this.getAttribute("index"));
	let value = parseInt(this.value);
	let pixel = getPixel(index);
	
	if (this.name == "x") {
		if (value < 0 || value >= image.element.width) {
			console.log("Can't move out of bounds.");
			this.value = pixel.pos.x;
		} else if (pixels.filter(function (element) {
			return element.pos.x == value && element.pos.y == pixel.pos.y;
		}).length > 0) {
			console.log("Can't move into another pixel.");
			this.value = pixel.pos.x;
		} else {
			console.log("Moved pixel to x: " + value + ".");
			pixel.pos.x = value;
		}
	} else if (this.name == "y") {
		if (value < 0 || value >= image.element.height) {
			console.log("Can't move out of bounds.");
			this.value = pixel.pos.y;
		} else if (pixels.filter(function (element) {
			return element.pos.x == pixel.pos.x && element.pos.y == value;
		}).length > 0) {
			console.log("Can't move into another pixel.");
			this.value = pixel.pos.y;
		} else {
			console.log("Moved pixel to y: " + value + ".");
			pixel.pos.y = value;
		}
	}
	draw();
}

function colorPixel(e) {
	let index = parseInt(this.getAttribute("index"));
	console.log("Selected color " + this.value + " from input.");
	getPixel(index).color = this.value;
	if (selectedIndex == index) {
		selectPixel();
	}
	draw();
}

function selectPixel() {
	selectedIndex = null
	for (let i = 0; i < pixels.length; i++) {
		let pixel = pixels[i]
		if (pixel.color == null) {
			selectedIndex = pixel.index;
			break;
		}
	}
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
	if (mouseLastPos && mouseDrag) {
		globalPos.move(mouseLastPos.getDistanceXY(canvasPos)); // Moves the global transformation by the distance between last mouse pos and current mouse pos.
	}
	mouseLastPos = new Position(canvasPos);
	draw();
});
canvas.addEventListener("mousedown", function (e) {
	let canvasPos = getEventCanvasPos(e);
	mouseLastPos = new Position(canvasPos);
	mouseStartPos = new Position(canvasPos);
	mouseDrag = true;
});
canvas.addEventListener("mouseup", function (e) {
	mouseDrag = false

	// Decides what should happen on click (not just end of drag).
	if (mouseStartPos != null && mouseStartPos.getDistance(getEventCanvasPos(e)) <= 10) {
		// Checks if a color box was clicked.
		let color = getPickerColor(mouseStartPos);
		if (color != null) {
			console.log("Selected color " + color + " from picker.");
			pixels.filter(function (pixel) { return pixel.color == null || pixel.index == selectedIndex; }).forEach(function (pixel) {
				pixel.color = color;
				holder.querySelector("input[type=color][index=\"" + pixel.index + "\"]").value = color;
			});
			selectedIndex = null;
			draw();
			return;
		}
		let mouseImagePos = mouseStartPos.toImageScale(); // Converts mouse position to a pixel on the image.

		// Checks if the click was out of bounds.
		if (mouseImagePos.x < 0 || mouseImagePos.y < 0 || mouseImagePos.x >= image.element.width || mouseImagePos.y >= image.element.height) {
			console.log("Cannot select pixel out of bounds.");
			return;
		}

		// Checks if an existing pixel was selected.
		for (let i = 0; i < pixels.length; i++) {
			let pixel = pixels[i];
			if (pixel.pos.x == mouseImagePos.x && pixel.pos.y == mouseImagePos.y) {
				console.log("Selected pixel " + pixel.index + ".");
				selectedIndex = pixel.index;
				draw();
				return;
			}
		}

		// Adds new pixel.
		let pixel = new Pixel(mouseImagePos)
		console.log("Created pixel " + pixel.index + ".");
		pixels.push(pixel);
		if (selectedIndex == null) {
			selectedIndex = pixel.index;
		}

		let copy = template.cloneNode(true);
		copy.querySelector("legend").innerHTML = "Pixel " + pixel.index;
		copy.index = pixel.index;

		let xInput = copy.querySelector("input[name=x]");
		xInput.setAttribute("index", pixel.index);
		xInput.value = pixel.pos.x;
		xInput.max = image.element.width - 1;
		xInput.addEventListener("change", movePixel);

		let yInput = copy.querySelector("input[name=y]");
		yInput.setAttribute("index", pixel.index);
		yInput.value = pixel.pos.y;
		yInput.max = image.element.height - 1;
		yInput.addEventListener("change", movePixel);

		let colorInput = copy.querySelector("input[type=color]");
		colorInput.setAttribute("index", pixel.index); // Need to do this for custom attributes for some reason.
		colorInput.addEventListener("input", colorPixel);

		copy.style = "";

		//let current = canvas.scrollTop;
		holder.appendChild(copy);
		//canvas.scrollTop = current;

		submitButton.value = "Change " + pixels.length + " pixels for " + pixels.length * 3 + "kr";
		submitButton.disabled = pixels.length <= 0;
		draw();
	}
});
canvas.addEventListener("mouseleave", function (e) {
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
	if (touchDrag != null) {
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
	if (touchDrag != null) {
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

	// Makes the individual pixels more clear.
	// https://stackoverflow.com/a/19129822/13347795
	// Yes, this is the right place to do this.
	// https://stackoverflow.com/a/29564875/13347795
	ctx.imageSmoothingEnabled = false;
	ctx.msImageSmoothingEnabled = false;
	ctx.mozImageSmoothingEnabled = false;
	ctx.webkitImageSmoothingEnabled = false;

	draw();
}
resize();
window.addEventListener("resize", resize);
showCheckbox.addEventListener("change", draw);