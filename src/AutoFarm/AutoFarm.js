const IAutoFarm = require("../../build/contracts/IAutoFarm.json");

const AutofarmConstants = require("./constants");

const LPTokenCalculator = require("../LPTokenCalculator");
const PriceFetcher = require("../BlockChainUtils/PriceFetcher");
const TokenInfoFetcher = require("../BlockChainUtils/TokenInfoFetcher");

function AutoFarm(web3) {
	this.web3 = web3;

	this.protocolName = "AutoFarm";

	this.getProtocolInformation = function (userAddress) {
		return this.getLPsParticipated(userAddress).then((participatedLPs) => {
			let participatedLPsPricePromise = [];
			participatedLPs.forEach((participatedLP) => {
				//LPTokenCalculator.getAverageAmountDepositedIntoLP(this.web3, userAddress, participatedLP.lpToken)

				// some of the contracts are ERC20 tokens, some are LP tokens. how to differentiate hmm...
				participatedLPsPricePromise.push(
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
										return (
											(participatedLP.amount / 10 ** tokenInfo.decimals) *
											pricePerLPToken
										);
									});
								});
							} else {
								return PriceFetcher.getPriceByTokenAddress(
									this.web3,
									participatedLP.want
								).then((pricePerToken) => {
									return TokenInfoFetcher.getTokenInfoFromAddress(
										this.web3,
										participatedLP.want
									).then((tokenInfo) => {
										return (
											(participatedLP.amount / 10 ** tokenInfo.decimals) *
											pricePerToken
										);
									});
								});
							}
						}
					)
				);
			});
			return Promise.all(participatedLPsPricePromise).then(
				(totalAmountInLP) => {
					return {
						totalAmount: totalAmountInLP.reduce(
							(acc, currentValue) => acc + currentValue
						),
						totalDeposits: 0,
						pendingEarn: 0,
					};
				}
			);
		});
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
