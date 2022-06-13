import { SendHttpPostRequest } from "/scripts/httpMethods.js";

console.log(await SendHttpPostRequest("/progress/", {
	text: "Hello World!"
}));