// Beware: 500+ lines of jank below.

import { colors, getCanvasPos, getEventCanvasPos } from "/paintMethods.js";

const canvas = document.getElementById("paintingCanvas");
var ctx = canvas.getContext("2d"); // const prevents colored pixels from being removed.
const image = { element: document.getElementById("paintingImage") };
const template = document.getElementById("selectedPixelTemplate");
const holder = document.getElementById("selectedPixelsHolder");
const submitButton = document.getElementById("submitButton");
const showCheckbox = document.getElementById("show");

const zoomMax = Math.pow(2, 8);
const zoomMin = Math.pow(2, -2);
const fontSize = 12;
const fontPadding = 2;
const removeRadius = 24;

// Contains the latest position of the color picker.
var picker;
class Picker {
	constructor(index) {
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
		if (this.pos.x > canvas.width / 2) { this.pos.x += globalPos.scale; }
		else { this.pos.x -= this.size.x; }
		if (this.pos.y < canvas.height / 2) { this.pos.y -= this.size.y - globalPos.scale; }
	}

	getBox(boxIndex) {
		let xIndex = boxIndex % this.rowLength;
		let yIndex = Math.floor(boxIndex / this.rowLength);
		return {
			x: this.pos.x + this.margin.x + this.box.size.x * xIndex + this.box.distance.x * xIndex,
			y: this.pos.y + this.margin.y + this.box.size.y * yIndex + this.box.distance.y * yIndex
		};
	}
}

class Position {
	constructor(pos) {
		this.x = pos.x;
		this.y = pos.y;
	}
	getDistance(pos) {
	return Math.sqrt(Math.pow(pos.x - this.x, 2) + Math.pow(pos.y - this.y, 2));
	}
	getEventDistance(e) {
	return this.getDistance({ x: e.clientX, y: e.clientY });
	}
	getDistanceXY(pos) {
		return { x: pos.x - this.x, y: pos.y - this.y };
	}
	getEventDistanceXY(e) {
		return this.getDistanceXY({ x: e.clientX, y: e.clientY });
	}
	toImageScale() {
		return { x: (this.x - image.pos.x) / globalPos.scale, y: (this.y - image.pos.y) / globalPos.scale };
	}
}
	
function EventPosition(e) {
	return Position({ x: e.clientX, y: e.clientY });
}

var pixels = [];
var pixelIndex = 0;
var selectedIndex = null;
class Pixel {
	constructor(pos, element) {
		this.index = pixelIndex;
		pixelIndex++;
		this.pos = { x: Math.floor(pos.x), y: Math.floor(pos.y) };
		this.element = element;
		this.color = null;
	}
	hasRemoveButton() {
		return this.index == selectedIndex && globalPos.scale >= removeRadius * 2
	}
}

// The global transformation of everything.
const globalPos = {
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
		ctx.strokeStyle = "#000000";
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
			if (globalPos.scale >= fontSize + fontPadding * 2) {
				ctx.fillStyle = "#ffffff";
				ctx.lineWidth = 4;
				ctx.strokeText(pixel.index, x + fontPadding, y + fontPadding);
				ctx.fillText(pixel.index, x + fontPadding, y + fontPadding);
			}
			// Draws corner X.
			if (pixel.hasRemoveButton()) {
				ctx.lineWidth = 2;
				let thickness = 4;
				ctx.fillStyle = "#ff0000";
				ctx.beginPath();
				ctx.moveTo(x + globalPos.scale, y + thickness);
				ctx.lineTo(x + globalPos.scale - (removeRadius - thickness) / 2, y + removeRadius / 2);
				ctx.lineTo(x + globalPos.scale, y + removeRadius - thickness);
				ctx.lineTo(x + globalPos.scale - thickness, y + removeRadius);
				ctx.lineTo(x + globalPos.scale - removeRadius / 2, y + (removeRadius + thickness) / 2);
				ctx.lineTo(x + globalPos.scale - removeRadius + thickness, y + removeRadius);
				ctx.lineTo(x + globalPos.scale - removeRadius, y + removeRadius - thickness);
				ctx.lineTo(x + globalPos.scale - (removeRadius + thickness) / 2, y + removeRadius / 2);
				ctx.lineTo(x + globalPos.scale - removeRadius, y + thickness);
				ctx.lineTo(x + globalPos.scale - removeRadius + thickness, y);
				ctx.lineTo(x + globalPos.scale - removeRadius / 2, y + (removeRadius - thickness) / 2);
				ctx.lineTo(x + globalPos.scale - thickness, y);
				ctx.closePath();
				ctx.stroke();
				ctx.fill();
			}
		});
	}

	// Draws color picker.
	if (selectedIndex != null) {
		picker = new Picker(selectedIndex);
		if (picker != null) {
			ctx.lineWidth = 3;
			ctx.fillStyle = "#ffffff";
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
		text = "X: " + Math.floor(mouseImagePos.x) + ", Y: " + Math.floor(mouseImagePos.y);
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
		selectNewPixel();
	}
	draw();
}

function selectNewPixel() {
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

function removePixel(pixel = null, arrayIndex = null) {
	if (pixel == null && arrayIndex != null) {
		pixel = getPixel(arrayIndex);
	}
	if (arrayIndex == null && pixel != null) {
		arrayIndex = pixels.indexOf(pixel);
	}
	pixel.element.remove();
	pixels.splice(arrayIndex, 1);
	selectNewPixel();
	updateButton();
}

function updateButton() {
	submitButton.value = "Change " + pixels.length + " pixels for " + pixels.length * 3 + "kr";
	submitButton.disabled = pixels.length <= 0;
}

// Mouse support.
var mouseDrag = false;
var mouseLastPos;
var mouseStartPos;
canvas.addEventListener("mousemove", function (e) {
	let canvasPos = getEventCanvasPos(e, canvas);
	if (mouseLastPos && mouseDrag) {
		globalPos.move(mouseLastPos.getDistanceXY(canvasPos)); // Moves the global transformation by the distance between last mouse pos and current mouse pos.
	}
	mouseLastPos = new Position(canvasPos);
	draw();
});
canvas.addEventListener("mousedown", function (e) {
	let canvasPos = getEventCanvasPos(e, canvas);
	mouseLastPos = new Position(canvasPos);
	mouseStartPos = new Position(canvasPos);
	mouseDrag = true;
});
canvas.addEventListener("mouseup", function (e) {
	mouseDrag = false

	// Decides what should happen on click (not just end of drag).
	if (mouseStartPos != null && mouseStartPos.getDistance(getEventCanvasPos(e, canvas)) <= 10) {
		// Checks if a color box was clicked.
		let color = getPickerColor(mouseStartPos);
		if (color != null) {
			console.log("Selected color " + color + " from picker.");
			pixels.filter(function (pixel) { return pixel.color == null || pixel.index == selectedIndex; }).forEach(function (pixel) {
				pixel.color = color;
				pixel.element.querySelector("input[type=color]").value = color;
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

		// Checks if an existing pixel was clicked.
		for (let i = 0; i < pixels.length; i++) {
			let pixel = pixels[i];
			if (pixel.pos.x == Math.floor(mouseImagePos.x) && pixel.pos.y == Math.floor(mouseImagePos.y)) {
				if (pixel.index != selectedIndex) {
					console.log("Selected pixel " + pixel.index + ".");
					selectedIndex = pixel.index;
				} else {
					if (pixel.color == null) {
						console.log("Removed pixel " + pixel.index + " with X.");
						removePixel(pixel, i);
					} else if (pixel.hasRemoveButton() && mouseImagePos.x - pixel.pos.x > 1 - removeRadius / globalPos.scale && mouseImagePos.y - pixel.pos.x > 1 - removeRadius / globalPos.scale) {
						console.log("Removed pixel " + pixel.index + " by deselecting.");
						removePixel(pixel, i);
					} else {
						console.log("Deselected pixel " + pixel.index + ".");
						selectNewPixel();
					}
				}
				draw();
				return;
			} else if (picker != null && mouseStartPos.x > picker.pos.x && mouseStartPos.y > picker.pos.y && mouseStartPos.x < picker.pos.x + picker.size.x && mouseStartPos.y < picker.pos.y + picker.size.y) {
				console.log("Clicked empty space in color clicker.")
				return;
			}
		}

		// Adds new pixel on this space.
		let pixel = new Pixel(mouseImagePos, template.cloneNode(true))
		console.log("Created pixel " + pixel.index + ".");
		pixels.push(pixel);
		if (selectedIndex == null) {
			selectedIndex = pixel.index;
		}
		pixel.element.querySelector("legend").innerHTML = "Pixel " + pixel.index;
		pixel.element.index = pixel.index;

		let xInput = pixel.element.querySelector("input[name=x]");
		xInput.setAttribute("index", pixel.index); // Need to do this for custom attributes for some reason.
		xInput.name = pixel.index + "x";
		xInput.value = pixel.pos.x;
		xInput.max = image.element.width - 1;
		xInput.addEventListener("change", movePixel);

		let yInput = pixel.element.querySelector("input[name=y]");
		yInput.setAttribute("index", pixel.index);
		yInput.name = pixel.index + "y";
		yInput.value = pixel.pos.y;
		yInput.max = image.element.height - 1;
		yInput.addEventListener("change", movePixel);

		let colorInput = pixel.element.querySelector("input[name=color]");
		colorInput.setAttribute("index", pixel.index);
		colorInput.name = pixel.index + "color";
		colorInput.addEventListener("input", colorPixel);

		pixel.element.querySelector("input[name=select").addEventListener("click", function (e) {
			if (pixel.index != selectedIndex) {
				console.log("Selected pixel " + pixel.index + " with button.");
				selectedIndex = pixel.index;
			} else if (pixel.color == null) {
				console.log("Removed pixel " + pixel.index + " by deselecting with button.");
				removePixel(pixel = pixel)
			} else {
				console.log("Deselected pixel " + pixel.index + " with button.");
				selectNewPixel();
			}
			draw();
		});

		pixel.element.querySelector("input[name=remove").addEventListener("click", function (e) {
			console.log("Removed pixel " + pixel.index + " with button.");
			removePixel(pixel = pixel);
			draw();
		});

		pixel.element.style = "";

		//let current = canvas.scrollTop;
		holder.appendChild(pixel.element);
		//canvas.scrollTop = current;

		updateButton();
		draw();
	}
});
canvas.addEventListener("mouseleave", function (e) {
	mouseDrag = false
});
canvas.addEventListener("wheel", function (e) {
	globalPos.zoom(e.deltaY);
	draw();
});

// Touchscreen dragging support.
var touchDrag = false;
var touchLastPos;
var touchStartPos;
function handleTouch(e) {
	let canvasPos;
	if (e.touches.length == 1) {
		canvasPos = getEventCanvasPos(e.touches[0], canvas);
		if (!touchDrag) {
			touchStartPos = new Position(canvasPos);
		}
	}
	touchDrag = e.touches.length == 1;
	if (touchDrag) {
		if (touchLastPos != null) {
			globalPos.move(touchLastPos.getDistanceXY(canvasPos));
			draw();
		}
		touchLastPos = new Position(canvasPos);
	} else {
		touchLastPos = null;
		touchStartPos = null;
	}
	
}
canvas.addEventListener("touchmove", handleTouch);
canvas.addEventListener("touchstart", handleTouch);
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