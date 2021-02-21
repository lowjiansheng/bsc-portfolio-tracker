// PriceFetcher is responsible for fetching prices of a token denominated in USD (proxy by BUSD)

const IPancakeFactory = require("../../build/contracts/IPancakeFactory.json");
const LiquidityPairFetcher = require("./LiquidityPairFetcher");
const TokenInfoFetcher = require("./TokenInfoFetcher");

const BlockChainUtilsConstants = require("./constants");

const BUSD_CONTRACT = "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56";

var getPriceByTokenAddress = function (web3, tokenAddress) {
	if (tokenAddress === BUSD_CONTRACT) {
		return new Promise((resolutionFunc, rejectionFunc) => {
			resolutionFunc("1");
		});
	}
	var contract = new web3.eth.Contract(
		IPancakeFactory["abi"],
		BlockChainUtilsConstants.PANCAKE_SWAP_FACTORY_ADDRESS
	);

	return contract.methods
		.getPair(tokenAddress, BUSD_CONTRACT)
		.call()
		.then((pairAddress) => {
			return LiquidityPairFetcher.getPairInformationWithPairAddress(
				web3,
				pairAddress
			).then((reserves) => {
				// we want to match token with the correct reserve
				let bUSDReserve;
				let tokenReserve;
				if (reserves["token0Address"] === BUSD_CONTRACT) {
					bUSDReserve = reserves["reserves"]["reserve0"];
					tokenReserve = reserves["reserves"]["reserve1"];
				} else {
					bUSDReserve = reserves["reserves"]["reserve1"];
					tokenReserve = reserves["reserves"]["reserve0"];
				}
				return bUSDReserve / tokenReserve;
			});
		});
};

module.exports = {
	getPriceByTokenAddress,
};
