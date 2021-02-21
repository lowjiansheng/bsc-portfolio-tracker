const IPancakePair = require("../../build/contracts/IPancakePair.json");
const IPancakeFactory = require("../../build/contracts/IPancakeFactory.json");

const Constants = require("./constants");
const http = require("https");

var getPairInformationWithPairAddress = function (web3, pairAddress) {
	var contract = new web3.eth.Contract(IPancakePair["abi"], pairAddress);
	return contract.methods
		.getReserves()
		.call()
		.then((reserves) => {
			return contract.methods
				.token0()
				.call()
				.then((token0Address) => {
					return contract.methods
						.token1()
						.call()
						.then((token1Address) => {
							return contract.methods
								.totalSupply()
								.call()
								.then((totalSupply) => {
									return contract.methods
										.decimals()
										.call()
										.then((decimals) => {
											return contract.methods
												.name()
												.call()
												.then((name) => {
													return {
														reserves: reserves,
														token0Address: token0Address,
														token1Address: token1Address,
														lpTotalSupply: totalSupply,
														lpDecimals: decimals,
														name: name,
													};
												});
										});
								});
						});
				});
		});
};

// This function allows us to differentiate between an LP token and a normal ERC token
// As there's no clean way to query this information, we will check for errors from the token0 method
var isTokenAnLPToken = function (web3, address) {
	const contract = new web3.eth.Contract(IPancakePair["abi"], address);
	return contract.methods
		.token0()
		.call()
		.then(() => {
			return true;
		})
		.catch(() => {
			return false;
		});
};

var getFactoryAddressWithPairContract = function (web3, pairAddress) {
	var contract = new web3.eth.Contract(IPancakePair["abi"], pairAddress);
	return contract.methods.factory().call();
};

var getPairContractWithTokensAddress = function (
	web3,
	factoryAddress,
	tokenA,
	tokenB
) {
	var contract = new web3.eth.Contract(IPancakeFactory["abi"], factoryAddress);
	return contract.methods.getPair(tokenA, tokenB).call();
};

var getAmountDepositedIntoPair = function (web3, userAddress, pairAddress) {
	getPairInformationWithPairAddress(web3, pairAddress).then(
		(pairInformation) => {
			let ercTokenAddress;
			if (
				pairInformation.token0Address.toLowerCase() ===
				Constants.WBNB_ADDRESS.toLowerCase()
			) {
				ercTokenAddress = pairInformation.token1Address;
			} else if (
				pairInformation.token1Address.toLowerCase() ===
				Constants.WBNB_ADDRESS.toLowerCase()
			) {
				ercTokenAddress = pairInformation.token0Address;
			} else {
				// ERC-ERC pair
			}
		}
	);

	getBEP20TransactionsByAddress(userAddress).then((transactionResults) => {
		//console.log(transactionResults.result)
		let transactionsInPair = transactionResults.result.filter((history) => {
			return history.to.toLowerCase() === pairAddress.toLowerCase();
		});
		//console.log(transactionsInPair)
	});
};

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

module.exports = {
	getPairInformationWithPairAddress,
	getFactoryAddressWithPairContract,
	getPairContractWithTokensAddress,
	getAmountDepositedIntoPair,
	isTokenAnLPToken,
};
