const LPTokenCalculator = require("../LPTokenCalculator");

// TODO: It doesn't have a generic contract for different pools.
// a real pain in the ass to read from each pool.
class PancakeBunny {
	constructor(web3) {
		this.web3 = web3;
	}

	calculateTotalDollarAmountInProtocol(userAddress) {}

	getLPsParticipated(userAddress) {}
}
