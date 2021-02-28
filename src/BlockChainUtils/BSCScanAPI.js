const http = require("https");

// This is a painfully huge transaction.
// TODO: Might be good to cache the data
var getBEP20TransactionsByAddress = function (userAddress) {
	return new Promise((resolve, reject) => {
		let options = {
			host: "api.bscscan.com",
			path:
				"/api?module=account&action=tokentx&address=" +
				userAddress +
				"&startblock=0&endblock=999999999&sort=asc&apikey=YourApiKeyToken",
		};
		http
			.request(options, (response) => {
				let str = "";
				response.on("data", (chunk) => {
					str += chunk;
				});
				response.on("end", () => {
					resolve(JSON.parse(str));
				});
			})
			.end();
	});
};

module.exports = { getBEP20TransactionsByAddress };
