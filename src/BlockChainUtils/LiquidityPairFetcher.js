const IPancakePair = require("../../build/contracts/IPancakePair.json");
const IPancakeFactory = require("../../build/contracts/IPancakeFactory.json");

const BSCScanUtils = require("../BscScanUtils/BscScanUtils");
const secrets = require("../secrets/secrets");

const Constants = require("./constants");
const http = require("https");
const { PANCAKESWAP_ROUTER_CONTRACT } = require("./constants");
const { runInNewContext } = require("vm");

var getPairInformationWithPairAddress = function (
	web3,
	pairAddress,
	accountTransactions
) {
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
													return getAmountDepositedIntoPair(
														web3,
														secrets.PUBLIC_ADDRESS_TO_TRACK,
														pairAddress,
														accountTransactions,
														token0Address,
														token1Address
													).then(() => {
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

var getAmountDepositedIntoPair = function (
	web3,
	userAddress,
	pairAddress,
	addressTransactions,
	token0Address,
	token1Address
) {
	/*
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
	);*/

	/*
	console.log(
		addressTransactions["result"].filter((tx) => {
			return (
				tx["hash"] ===
				"0x50a86fe02e264f07e40774af9cb7da7a127b833cef20fdf3cbddc838180875b4"
			);
		})
	);*/

	if (addressTransactions === undefined) {
		return new Promise((resolve, reject) => {
			resolve();
		});
	} else {
		return getDepositTxHashes(
			pairAddress,
			addressTransactions,
			userAddress,
			token0Address,
			token1Address
		).then((txHashes) => {
			if (txHashes !== undefined) {
				for (let i = 0; i < txHashes.length; i++) {
					let filteredTransactions = addressTransactions["result"].filter(
						(transaction) => {
							return transaction["hash"] === txHashes[i];
						}
					);
					console.log(filteredTransactions);
				}
			}
		});
	}
};

// deposit transactions should have 2/3 transactions in total
// 3 transactions if non BNB is used.
// 2 transactions if BNB is used. We can get the 3rd transaction from internal tx.
function getDepositTxHashes(
	pairAddress,
	addressTransactions,
	userAddress,
	token0Address,
	token1Address
) {
	return new Promise((resolve, reject) => {
		// identify amount of tokens deposited into the pool
		// the tx would include a sending of the pair token to user address
		const potentialDepositTxHashes = addressTransactions["result"].filter(
			(result) => {
				return (
					result["contractAddress"] === pairAddress.toLowerCase() &&
					result["to"] === userAddress.toLowerCase()
				);
			}
		);
		if (potentialDepositTxHashes.length === 0) {
			console.log(
				"cannot find tx with lp deposit. lp-token might be deposited from other wallets"
			);
			resolve();
		} else {
			//0x43d6b45b2acb991db412bb3ccc80c611b7bee74c9607b5da1fb54b0753e5679d
			let potentialDepositTxHashesPromise = [];
			for (let i = 0; i < potentialDepositTxHashes.length; i++) {
				potentialDepositTxHashesPromise.push(
					BSCScanUtils.getBscScanInternalTransactionsBasedOnTxHash(
						potentialDepositTxHashes[i]["hash"]
					).then((internalHashes) => {
						const filteredInternalHashes = internalHashes["result"].filter(
							(result) => {
								return result["from"] === PANCAKESWAP_ROUTER_CONTRACT;
							}
						);
						console.log(filteredInternalHashes);
						if (filteredInternalHashes.length > 0) {
							return potentialDepositTxHashes[i]["hash"];
						} else {
							return;
						}
					})
				);
			}
			Promise.all(potentialDepositTxHashesPromise).then((depositTxHashes) => {
				const filteredDepositTxHashes = depositTxHashes.filter(
					(depositTxHash) => {
						return depositTxHash !== undefined;
					}
				);
				resolve(filteredDepositTxHashes);
			});
		}
	});
}

module.exports = {
	getPairInformationWithPairAddress,
	getFactoryAddressWithPairContract,
	getPairContractWithTokensAddress,
	getAmountDepositedIntoPair,
	isTokenAnLPToken,
};
