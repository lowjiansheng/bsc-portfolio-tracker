const IPancakeSwapContract = require("../../build/contracts/IPancakeSwap.json");

const CakeConstants = require("./constants");

const LPTokenCalculator = require("../LPTokenCalculator");
const PriceFetcher = require("../BlockChainUtils/PriceFetcher");
const TokenInfoFetcher = require("../BlockChainUtils/TokenInfoFetcher");

function PancakeSwap(web3) {
	this.web3 = web3;

	this.protocolName = "Pancake Swap";

	// TODO: refactor this method. Too much repetitive code.
	this.getProtocolInformation = function (userAddress) {
		return TokenInfoFetcher.getTokenInfoWithPriceFromAddress(
			this.web3,
			CakeConstants.CAKE_TOKEN_ADDRESS
		).then((cakeTokenInfo) => {
			return this.getLPsParticipated(userAddress).then((participatedPools) => {
				let participatedPoolsResultsPromise = [];
				participatedPools.forEach((participatedPool) => {
					participatedPoolsResultsPromise.push(
						LPTokenCalculator.isLPToken(
							this.web3,
							participatedPool.lpToken
						).then((isLP) => {
							if (isLP) {
								return LPTokenCalculator.getPriceOfLPToken(
									this.web3,
									participatedPool.lpToken
								).then((pricePerLPToken) => {
									return TokenInfoFetcher.getTokenInfoFromAddress(
										this.web3,
										participatedPool.lpToken
									).then((tokenInfo) => {
										const totalAmountDeposit =
											participatedPool.amount / 10 ** tokenInfo.decimals;
										const pendingCake =
											participatedPool.pendingCake /
											10 ** cakeTokenInfo.decimals;
										const pendingValueCake =
											pendingCake * cakeTokenInfo.pricePerToken;
										return {
											totalValueAmount: totalAmountDeposit * pricePerLPToken,
											amountDeposit: totalAmountDeposit,
											pendingCake: pendingCake,
											pendingValueCake: pendingValueCake,
										};
									});
								});
							} else {
								return TokenInfoFetcher.getTokenInfoWithPriceFromAddress(
									this.web3,
									participatedPool.lpToken
								).then((tokenInfo) => {
									const totalAmountDeposit =
										participatedPool.amount / 10 ** tokenInfo.decimals;
									const pendingCake =
										participatedPool.pendingCake / 10 ** cakeTokenInfo.decimals;
									const pendingValueCake =
										pendingCake * cakeTokenInfo.pricePerToken;
									return {
										totalValueAmount:
											totalAmountDeposit * tokenInfo.pricePerToken,
										amountDeposit: totalAmountDeposit,
										pendingCake: pendingCake,
										pendingValueCake: pendingValueCake,
									};
								});
							}
						})
					);
				});
				return Promise.all(participatedPoolsResultsPromise).then(
					(participatedPoolsResults) => {
						const totalValueDeposits = participatedPoolsResults.reduce(
							(acc, currentValue) => acc + currentValue.totalValueAmount,
							0
						);
						const pendingEarn = participatedPoolsResults.reduce(
							(acc, currentValue) => acc + currentValue.pendingValueCake,
							0
						);
						return {
							totalAmount: totalValueDeposits + pendingEarn,
							totalDeposits: totalValueDeposits,
							pendingEarn: pendingEarn,
							protocolInformation: {
								poolsParticipated: participatedPoolsResults,
							},
						};
					}
				);
			});
		});
	};

	this.getLPsParticipated = function (userAddress) {
		let contract = new this.web3.eth.Contract(
			IPancakeSwapContract,
			CakeConstants.PANCAKE_MAIN_STAKING_CONTRACT
		);

		return contract.methods
			.poolLength()
			.call()
			.then((poolLength) => {
				let poolInfoRequests = [];
				for (let i = 0; i < poolLength; i++) {
					poolInfoRequests.push(
						contract.methods.userInfo(i, userAddress).call()
					);
				}
				return Promise.all(poolInfoRequests).then((userPoolInfos) => {
					let participatedPoolInfoPromise = [];
					for (let i = 0; i < poolLength; i++) {
						if (userPoolInfos[i].amount !== "0") {
							participatedPoolInfoPromise.push(
								contract.methods
									.poolInfo(i)
									.call()
									.then((poolInfo) => {
										return contract.methods
											.pendingCake(i, userAddress)
											.call()
											.then((pendingCake) => {
												poolInfo.amount = userPoolInfos[i].amount;
												poolInfo.rewardDebt = userPoolInfos[i].rewardDebt;
												poolInfo.pendingCake = pendingCake;
												return poolInfo;
											});
									})
							);
						}
					}
					return Promise.all(participatedPoolInfoPromise);
				});
			});
	};
}

module.exports = {
	PancakeSwap,
};
