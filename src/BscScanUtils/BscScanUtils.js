const BSCSCAN_HOST = "api.bscscan.com";
const http = require("https");
const BSCSCAN_API_KEY = require("../secrets/secrets").BSCSCAN_API_KEY;

let bscScanTransactions;

function getBscScanTransactions(userAddress) {
	if (bscScanTransactions === undefined) {
		return setupBscScan(userAddress).then(() => {
			return bscScanTransactions;
		});
	} else {
		return new Promise((resolve, _) => {
			resolve(bscScanTransactions);
		});
	}
}

function getBscScanInternalTransactionsBasedOnTxHash(txHash) {
	return new Promise((resolve, reject) => {
		let options = {
			host: BSCSCAN_HOST,
			path: createInternalTransactionPath(txHash),
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
				response.on("error", (err) => {
					console.log(err.stack);
					reject();
				});
			})
			.end();
	});
}

/*
 * setupBscScan calls Bscscan service and caches the transactions of the user
 * account into memory. This is so that we don't hit the limit on bscscan
 */
function setupBscScan(userAddress) {
	return new Promise((resolve, reject) => {
		let options = {
			host: BSCSCAN_HOST,
			path: createTransactionPath(userAddress),
		};
		http
			.request(options, (response) => {
				let str = "";
				response.on("data", (chunk) => {
					str += chunk;
				});
				response.on("end", () => {
					bscScanTransactions = JSON.parse(str);
					resolve(true);
				});
				response.on("error", (err) => {
					console.log(err.stack);
					reject();
				});
			})
			.end();
	});
}

function createInternalTransactionPath(txHash) {
	return (
		"/api?module=account&action=txlistinternal&txhash=" +
		txHash +
		"&apikey=" +
		BSCSCAN_API_KEY
	);
}

function createTransactionPath(userAddress) {
	return (
		"/api?module=account&action=tokentx&address=" +
		userAddress +
		"&startblock=0&endblock=999999999&sort=asc&apikey=" +
		BSCSCAN_API_KEY
	);
}

module.exports = {
	getBscScanTransactions,
	getBscScanInternalTransactionsBasedOnTxHash,
};
