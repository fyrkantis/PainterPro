import { SendHttpPostRequest, GetCookie } from "/scripts/httpMethods.js";

const qrImage = document.getElementById("qr");

console.log(await SendHttpPostRequest("/update/", {
	text: "Hello World!"
}));

console.log(document.cookie);
const uuid = GetCookie("DrawRequestUuid");
console.log(uuid);
//window.location = "swish://paymentrequest?token=" + uuid; // TODO: Add callback url.

qrImage.setAttribute("src", "/qr/?size=500&uuid=" + uuid)
qrImage.style = "";