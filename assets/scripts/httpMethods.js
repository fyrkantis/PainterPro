// https://stackoverflow.com/a/48969580
export function SendHttpPostRequest(url, json) {
	return new Promise(function (resolve, reject, responseType = "json") {
		let request = new XMLHttpRequest();
		request.open("POST", url)
		request.setRequestHeader("Content-Type", "application/json");
		request.responseType = responseType

		request.onload = function () {
			if (this.status >= 200 && this.status < 300) {
				if (this.responseType == responseType) {
					resolve(this.response);
				} else {
					reject("Received server response in wrong format \"" + this.responseType + "\" instead of " + responseType + ".");
				}
			} else {
				reject("Received \"" + this.status + ": " + this.statusText + "\" error response from server.");
			}
		};
		request.onerror = function () {
			reject("Received \"" + this.status + ": " + this.statusText + "\" error response from server.");
		};
		request.send(JSON.stringify(json));
	});
}

// https://stackoverflow.com/a/25490531
export function GetCookie(name) {
	return document.cookie.match("(^|;)\\s*" + name + "\\s*=\\s*([^;]+)")?.pop() || "";
}

export function PayInApp(uuid) {

}