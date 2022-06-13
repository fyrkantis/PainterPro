// https://stackoverflow.com/a/48969580
export function SendHttpPostRequest(url, json) {
	return new Promise(function (resolve, reject) {
		let request = new XMLHttpRequest();
		request.open("POST", url)
		request.setRequestHeader("Content-Type", "application/json");

		request.onload = function () {
			if (this.status >= 200 && this.status < 300) {
				resolve(request.response);
			} else {
				reject({
					status: this.status,
					statusText: this.statusText
				});
			}
		};
		request.onerror = function () {
			reject({
				status: this.status,
				statusText: this.statusText
			});
		};
		request.send(JSON.stringify(json));
	});
}