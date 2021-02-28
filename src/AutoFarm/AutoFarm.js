const IAutoFarm = require("../../build/contracts/IAutoFarm.json");

const AutofarmConstants = require("./constants");

const LPTokenCalculator = require("../LPTokenCalculator");
const PriceFetcher = require("../BlockChainUtils/PriceFetcher");
const TokenInfoFetcher = require("../BlockChainUtils/TokenInfoFetcher");
const BSCScanAPI = require("../BlockChainUtils/BSCScanAPI");
const PoolsUtils = require("./PoolsUtils");

function AutoFarm(web3) {
	this.web3 = web3;

	this.protocolName = "AutoFarm";

	this.getProtocolInformation = function (userAddress) {
		return BSCScanAPI.getBEP20TransactionsByAddress(userAddress).then(
			(transactionResults) => {
				//console.log(transactionResults);
				return this.getLPsParticipated(userAddress).then((participatedLPs) => {
					let participatedLPsPricePromise = [];
					participatedLPs.forEach((participatedLP) => {
						const depositValue = PoolsUtils.calculatePoolDeposits(
							transactionResults,
							AutofarmConstants.AUTOFARM_CONTRACT,
							participatedLP.want
						);
						participatedLPsPricePromise.push(
							// TODO: refactor this. too many repetitive code
							LPTokenCalculator.isLPToken(this.web3, participatedLP.want).then(
								(isLP) => {
									if (isLP) {
										return LPTokenCalculator.getPriceOfLPToken(
											this.web3,
											participatedLP.want
										).then((pricePerLPToken) => {
											return TokenInfoFetcher.getTokenInfoFromAddress(
												this.web3,
												participatedLP.want
											).then((tokenInfo) => {
												const totalAmount =
													(participatedLP.amount / 10 ** tokenInfo.decimals) *
													pricePerLPToken;
												const amountDeposited =
													depositValue / 10 ** tokenInfo.decimals;
												const amountDepositedValue =
													amountDeposited * pricePerLPToken;
												const amountEarned =
													(participatedLP.amount - depositValue) /
													10 ** tokenInfo.decimals;
												const amountEarnedValue =
													amountEarned * pricePerLPToken;
												participatedLP.amountDeposited = amountDeposited;
												participatedLP.amountDepositedValue = amountDepositedValue;
												participatedLP.amountEarned = amountEarned;
												participatedLP.amountEarnedValue = amountEarnedValue;
												return {
													totalAmount: totalAmount,
													participatedLP: participatedLP,
												};
											});
										});
									} else {
										return TokenInfoFetcher.getTokenInfoWithPriceFromAddress(
											this.web3,
											participatedLP.want
										).then((tokenInfo) => {
											const totalAmount =
												(participatedLP.amount / 10 ** tokenInfo.decimals) *
												tokenInfo.pricePerToken;
											const amountDeposited =
												depositValue / 10 ** tokenInfo.decimals;
											const amountDepositedValue =
												amountDeposited * tokenInfo.pricePerToken;
											const amountEarned =
												(participatedLP.amount - depositValue) /
												10 ** tokenInfo.decimals;
											const amountEarnedValue =
												amountEarned * tokenInfo.pricePerToken;
											participatedLP.amountDeposited = amountDeposited;
											participatedLP.amountDepositedValue = amountDepositedValue;
											participatedLP.amountEarned = amountEarned;
											participatedLP.amountEarnedValue = amountEarnedValue;
											return {
												totalAmount: totalAmount,
												participatedLP: participatedLP,
											};
										});
									}
								}
							)
						);
					});
					return Promise.all(participatedLPsPricePromise).then(
						(totalAmountInLP) => {
							const listOfParticipatedPools = [];
							totalAmountInLP.forEach((pool) => {
								listOfParticipatedPools.push(pool.participatedLP);
							});

							return {
								totalAmount: totalAmountInLP.reduce(
									(acc, currentValue) => acc + currentValue.totalAmount,
									0
								),
								totalDeposits: 0,
								pendingEarn: 0,
								protocolInformation: {
									participatedPools: listOfParticipatedPools,
								},
							};
						}
					);
				});
			}
		);
	};

	this.getLPsParticipated = function (userAddress) {
		let contract = new this.web3.eth.Contract(
			IAutoFarm,
			AutofarmConstants.AUTOFARM_CONTRACT
		);

		// this might take some time. autofarm has a lot of pools...
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
						if (userPoolInfos[i].shares !== "0") {
							participatedPoolInfoPromise.push(
								contract.methods
									.poolInfo(i)
									.call()
									.then((poolInfo) => {
										return contract.methods
											.stakedWantTokens(i, userAddress)
											.call()
											.then((stakedTokens) => {
												poolInfo.i = i;
												poolInfo.amount = stakedTokens;
												poolInfo.rewardDebt = userPoolInfos[i].rewardDebt;
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
	AutoFarm,
};
