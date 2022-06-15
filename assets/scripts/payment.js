import { SendHttpPostRequest, GetCookie } from "/scripts/httpMethods.js";

console.log(await SendHttpPostRequest("/update/", {
	text: "Hello World!"
}));