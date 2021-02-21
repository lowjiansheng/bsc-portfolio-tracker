const IGooseChef = require("../../build/contracts/IGooseChef.json");

const GooseConstants = require("./constants");

const LPTokenCalculator = require("../LPTokenCalculator");
const PriceFetcher = require("../BlockChainUtils/PriceFetcher");
const TokenInfoFetcher = require("../BlockChainUtils/TokenInfoFetcher");

function Goose(web3) {
	this.web3 = web3;

	this.protocolName = "Goose Finance";

	this.getProtocolInformation = function (userAddress) {
		return this.getLPsParticipated(userAddress).then((participatedLPs) => {
			let participatedLPsPricePromise = [];
			participatedLPs.forEach((participatedLP) => {
				participatedLPsPricePromise.push(
					LPTokenCalculator.isLPToken(this.web3, participatedLP.lpToken).then(
						(isLP) => {
							if (isLP) {
								return LPTokenCalculator.getPriceOfLPToken(
									this.web3,
									participatedLP.lpToken
								).then((pricePerLPToken) => {
									return TokenInfoFetcher.getTokenInfoFromAddress(
										this.web3,
										participatedLP.lpToken
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
									participatedLP.lpToken
								).then((pricePerToken) => {
									return TokenInfoFetcher.getTokenInfoFromAddress(
										this.web3,
										participatedLP.lpToken
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
					};
				}
			);
		});
	};

	this.getLPsParticipated = function (userAddress) {
		let contract = new this.web3.eth.Contract(
			IGooseChef,
			GooseConstants.GOOSE_CHEF_CONTRACT
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
						if (userPoolInfos[i].shares !== "0") {
							participatedPoolInfoPromise.push(
								contract.methods
									.poolInfo(i)
									.call()
									.then((poolInfo) => {
										poolInfo.amount = userPoolInfos[i].amount;
										poolInfo.rewardDebt = userPoolInfos[i].rewardDebt;
										return poolInfo;
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
	Goose,
};
