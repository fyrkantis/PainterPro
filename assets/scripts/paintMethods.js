// Gathers list of all colors from datalist in html.
var colorOptions = document.getElementById("colors").getElementsByTagName("option");
export var colors = [];
for (let i = 0; i < colorOptions.length; i++) {
	colors.push(colorOptions[i].value)
}

// Gets mouse coordinates on canvas.
export function getCanvasPos(pos, canvas) {
	let rect = canvas.getBoundingClientRect();
	return { x: pos.x - rect.left, y: pos.y - rect.top };
}
export function getEventCanvasPos(e, canvas) {
	return getCanvasPos({ x: e.clientX, y: e.clientY }, canvas)
}