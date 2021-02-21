const ICrowFarm = require("../../build/contracts/ICrowFarm.json");
const CROW_CONSTANTS = require("./constants");

const LPTokenCalculator = require("../LPTokenCalculator");
const TokenInfoFetcher = require("../BlockChainUtils/TokenInfoFetcher");

function CrowFinance(web3) {
	this.web3 = web3;

	this.protocolName = "CrowFinance";

	this.getProtocolInformation = function (userAddress) {
		const contract = new this.web3.eth.Contract(
			ICrowFarm,
			CROW_CONSTANTS.CROW_FARM_ADDRESS
		);
		return TokenInfoFetcher.getTokenInfoWithPriceFromAddress(
			this.web3,
			CROW_CONSTANTS.CROW_TOKEN_ADDRESS
		).then((crowTokenInfo) => {
			return this.getLPsParticipated(userAddress, contract).then(
				(participatedLPs) => {
					let participatedLPsPricePromise = [];
					let i = 0;
					participatedLPs.forEach((participatedLP) => {
						//LPTokenCalculator.getAverageAmountDepositedIntoLP(this.web3, userAddress, participatedLP.lpToken)
						participatedLPsPricePromise.push(
							LPTokenCalculator.getPriceOfLPToken(
								this.web3,
								participatedLP.lpToken
							).then((pricePerLPToken) => {
								let pendingCrowAmount =
									parseFloat(participatedLP.pendingCrow) /
									10 ** crowTokenInfo.decimals;
								return {
									amountInLP:
										(participatedLP.amount / 10 ** 18) * pricePerLPToken,
									pendingCrow: pendingCrowAmount,
									valuePendingCrow:
										pendingCrowAmount * crowTokenInfo.pricePerToken,
								};
							})
						);
						i++;
					});
					return Promise.all(participatedLPsPricePromise).then(
						(lpsParticipatedResults) => {
							const totalDeposits = lpsParticipatedResults.reduce(
								(acc, currentValue) => acc + currentValue.amountInLP,
								0
							);
							const totalPendingCrow = lpsParticipatedResults.reduce(
								(acc, currentValue) => acc + currentValue.pendingCrow,
								0
							);
							const totalValuePendingCrow = lpsParticipatedResults.reduce(
								(acc, currentValue) => acc + currentValue.valuePendingCrow,
								0
							);
							return {
								totalAmount: totalDeposits + totalValuePendingCrow,
								totalDeposits: totalDeposits,
								pendingEarn: totalValuePendingCrow,
								protocolInformation: {
									totalValueInLP: totalDeposits,
									totalValuePendingCrow: totalValuePendingCrow,
									totalPendingCrow: totalPendingCrow,
									lpsParticipated: lpsParticipatedResults,
								},
							};
						}
					);
				}
			);
		});
	};

	this.getLPsParticipated = function (userAddress, contract) {
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
											.pendingCrow(i, userAddress)
											.call()
											.then((pendingCrow) => {
												poolInfo.amount = userPoolInfos[i].amount;
												poolInfo.rewardDebt = userPoolInfos[i].rewardDebt;
												poolInfo.pendingCrow = pendingCrow;
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
	CrowFinance,
};
