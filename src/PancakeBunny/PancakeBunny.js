const LPTokenCalculator = require("../LPTokenCalculator");
const IPancakeBunnyCompoundingFLIP = require("../../build/contracts/IPancakeBunnyCompoundingFLIP.json");

const constants = require("./constants");

// TODO: It doesn't have a generic contract for different pools.
// a real pain in the ass to read from each pool.
// If you want to track the pool you're in, please implement it yourself. :(
function PancakeBunny(web3) {
	this.web3 = web3;

	this.protocolName = "Pancake Bunny";

	this.getProtocolInformation = function (userAddress, accountTransactions) {
		const contract = new this.web3.eth.Contract(
			IPancakeBunnyCompoundingFLIP,
			constants.AUTO_COMPOUNDING_CAKE_BNB_ADDRESS
		);
		return this.getPoolTokenPrice(contract, accountTransactions).then(
			(tokenPrice) => {
				return contract.methods
					.principalOf(userAddress)
					.call()
					.then((depositedAmount) => {
						return contract.methods
							.earned(userAddress)
							.call()
							.then((earnedAmount) => {
								const depositedAmountInETH =
									parseFloat(depositedAmount) / 10 ** 18;
								const earnedAmountInETH = parseFloat(earnedAmount) / 10 ** 18;
								const totalAmount = depositedAmountInETH + earnedAmountInETH;
								return {
									totalAmount: totalAmount * tokenPrice,
									totalDeposits: depositedAmountInETH * tokenPrice,
									pendingEarn: earnedAmountInETH * tokenPrice,
								};
							});
					});
			}
		);
	};

	this.getPoolTokenPrice = function (contract, accountTransactions) {
		return contract.methods
			.stakingToken()
			.call()
			.then((tokenAddress) => {
				return LPTokenCalculator.getPriceOfLPToken(
					this.web3,
					tokenAddress,
					accountTransactions
				);
			});
	};
}

module.exports = {
	PancakeBunny,
};
