import { SendHttpPostRequest, GetCookie } from "/scripts/httpMethods.js";
import { IsMobile } from "/scripts/util.js";

const qrHolder = document.getElementById("qrHolder");
const statusList = document.getElementById("statusList");
const statusTemplate = document.getElementById("statusTemplate");

statusTemplate.getElementsByClassName("statusTime")[0].innerHTML = clockTime(new Date())
statusTemplate.style = "";

const uuid = GetCookie("DrawRequestUuid");
const mobile = IsMobile();

let lastStatus = "";

if (mobile) {
	swishRedirect();
}

PingServer();
async function PingServer() {
	let response = await SendHttpPostRequest("/update/", {
		uuid: uuid
	});
	console.log(response);
	if (response.status != lastStatus) {
		lastStatus = response.status;
		let clone = statusTemplate.cloneNode(true);
		
		clone.getElementsByClassName("statusTime")[0].innerHTML = clockTime(new Date());
		clone.getElementsByClassName("statusName")[0].innerHTML = response.status;
		statusList.appendChild(clone);

		if (response.status.toLowerCase() == "created") {
			document.getElementById("qr").setAttribute("src", "/qr/?size=500&uuid=" + uuid);
			qrHolder.style = "";
			clone.getElementsByClassName("statusInfo")[0].innerHTML = "Awaiting payment.";
			clone.getElementsByClassName("statusInfoHolder")[0].style = "";
		} else if (response.status.toLowerCase() == "paid") {
			qrHolder.style = "display: none;";
			clone.getElementsByClassName("statusInfo")[0].innerHTML = "Redirecting...";
			clone.getElementsByClassName("statusInfoHolder")[0].style = "";
			setTimeout(function () {
				window.location = "/";
			}, 2000);
			return;
		}
	}
	setTimeout(PingServer, 1000)
}

function clockTime(time) {
	return time.getHours() + ":" + time.getMinutes() + ":" + time.getSeconds();
}

// Tries to open the swish app.
function swishRedirect() {
	window.location = "swish://paymentrequest?token=" + uuid;
}