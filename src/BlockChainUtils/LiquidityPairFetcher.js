const IPancakePair = require("../../build/contracts/IPancakePair.json");
const IPancakeFactory = require("../../build/contracts/IPancakeFactory.json");

const BSCScanUtils = require("../BscScanUtils/BscScanUtils");
const secrets = require("../secrets/secrets");

const { PANCAKESWAP_ROUTER_CONTRACT, WBNB_ADDRESS } = require("./constants");

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

var getAmountDepositedIntoPair = function (
	web3,
	userAddress,
	pairAddress,
	addressTransactions,
	token0Address,
	token1Address
) {
	if (addressTransactions === undefined) {
		return new Promise((resolve, reject) => {
			resolve({});
		});
	} else {
		return getDepositTxHashes(
			pairAddress,
			addressTransactions,
			userAddress,
			token0Address,
			token1Address
		).then((depositTxHashes) => {
			return getTotalTokenDeposited(depositTxHashes);
		});
	}
};

function getTotalTokenDeposited(depositTransactions) {
	if (depositTransactions.length === 0) {
		return {
			totalToken0: 0,
			totalToken1: 0,
			totalLPTokenReceived: 0,
		};
	}

	const sumToken0 = depositTransactions.reduce((acc, curr) => {
		return acc + parseFloat(curr.amountToken0);
	}, 0);
	const sumToken1 = depositTransactions.reduce((acc, curr) => {
		return acc + parseFloat(curr.amountToken1);
	}, 0);
	const totalLPTokenReceived = depositTransactions.reduce((acc, curr) => {
		return acc + parseFloat(curr.amountLPTokenReceived);
	}, 0);
	return {
		totalToken0: sumToken0,
		totalToken1: sumToken1,
		totalLPTokenReceived: totalLPTokenReceived,
	};
}

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
	// identify amount of tokens deposited into the pool
	// the tx would include a sending of the pair token to user address
	const txHashesThatSendLPToUser = addressTransactions["result"].filter(
		(result) => {
			return (
				result["contractAddress"] === pairAddress.toLowerCase() &&
				result["to"] === userAddress.toLowerCase()
			);
		}
	);
	if (txHashesThatSendLPToUser.length === 0) {
		console.log(
			"cannot find tx with lp deposit. lp-token might be deposited from other wallets"
		);
		return new Promise((resolve, reject) => {
			resolve([]);
		});
	} else {
		//0x43d6b45b2acb991db412bb3ccc80c611b7bee74c9607b5da1fb54b0753e5679d
		let potentialDepositTxHashesPromise = [];
		for (let i = 0; i < txHashesThatSendLPToUser.length; i++) {
			let potentialDepositTransactionGroup = addressTransactions[
				"result"
			].filter((transaction) => {
				return transaction["hash"] === txHashesThatSendLPToUser[i]["hash"];
			});

			potentialDepositTxHashesPromise.push(
				new Promise((resolve, reject) => {
					if (potentialDepositTransactionGroup.length === 3) {
						let res;
						if (
							potentialDepositTransactionGroup[0][
								"contractAddress"
							].toLowerCase() === token0Address.toLowerCase() &&
							potentialDepositTransactionGroup[1][
								"contractAddress"
							].toLowerCase() === token1Address.toLowerCase()
						) {
							res = {
								amountToken0: potentialDepositTransactionGroup[0]["value"],
								amountToken1: potentialDepositTransactionGroup[1]["value"],
								amountLPTokenReceived:
									potentialDepositTransactionGroup[2]["value"],
							};
						} else if (
							potentialDepositTransactionGroup[1][
								"contractAddress"
							].toLowerCase() === token0Address.toLowerCase() &&
							potentialDepositTransactionGroup[0][
								"contractAddress"
							].toLowerCase() === token1Address.toLowerCase()
						) {
							res = {
								amountToken0: potentialDepositTransactionGroup[1]["value"],
								amountToken1: potentialDepositTransactionGroup[0]["value"],
								amountLPTokenReceived:
									potentialDepositTransactionGroup[2]["value"],
							};
						}
						resolve(res);
						// case where 1 of the pair is BNB
					} else if (potentialDepositTransactionGroup.length === 2) {
						let res;
						if (
							token0Address.toLowerCase() === WBNB_ADDRESS.toLowerCase() &&
							potentialDepositTransactionGroup[0][
								"contractAddress"
							].toLowerCase() === token1Address.toLowerCase()
						) {
							resolve(
								BSCScanUtils.getBscScanInternalTransactionsBasedOnTxHash(
									txHashesThatSendLPToUser[i]["hash"]
								).then((internalTx) => {
									if (
										internalTx["result"].length === 1 &&
										internalTx["result"][0]["to"] === WBNB_ADDRESS
									) {
										res = {
											amountToken0: internalTx[0]["value"],
											amountToken1:
												potentialDepositTransactionGroup["result"][0]["value"],
											amountLPTokenReceived:
												potentialDepositTransactionGroup[1]["value"],
										};
										return res;
									}
								})
							);
						} else if (
							token1Address.toLowerCase() === WBNB_ADDRESS.toLowerCase() &&
							potentialDepositTransactionGroup[0][
								"contractAddress"
							].toLowerCase() === token0Address.toLowerCase()
						) {
							resolve(
								BSCScanUtils.getBscScanInternalTransactionsBasedOnTxHash(
									txHashesThatSendLPToUser[i]["hash"]
								).then((internalTx) => {
									if (
										internalTx["result"].length === 1 &&
										internalTx["result"][0]["to"].toLowerCase() ===
											WBNB_ADDRESS.toLowerCase()
									) {
										res = {
											amountToken0:
												potentialDepositTransactionGroup[0]["value"],
											amountToken1: internalTx["result"][0]["value"],
											amountLPTokenReceived:
												potentialDepositTransactionGroup[1]["value"],
										};
										return res;
									}
								})
							);
						} else {
							resolve();
						}
					} else {
						resolve();
					}
				})
			);
		}
		return Promise.all(potentialDepositTxHashesPromise).then((res) => {
			return res.filter((indivRes) => {
				return indivRes !== undefined;
			});
		});
	}
}

module.exports = {
	getPairInformationWithPairAddress,
	getFactoryAddressWithPairContract,
	getPairContractWithTokensAddress,
	getAmountDepositedIntoPair,
	isTokenAnLPToken,
};
