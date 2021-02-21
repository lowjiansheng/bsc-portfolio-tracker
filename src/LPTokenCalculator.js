const PriceFetcher = require("./BlockChainUtils/PriceFetcher");
const LiquidityPairFetcher = require("./BlockChainUtils/LiquidityPairFetcher");
const TokenInfoFetcher = require("./BlockChainUtils/TokenInfoFetcher");

var getPriceOfLPToken = function (web3, pairAddress) {
	return LiquidityPairFetcher.getPairInformationWithPairAddress(
		web3,
		pairAddress
	).then((pairInfo) => {
		const totalLPSupply = pairInfo.lpTotalSupply / 10 ** pairInfo.lpDecimals;
		const ratioOf1LPToTotalSuppler = 1 / totalLPSupply;
		return TokenInfoFetcher.getTokenInfoFromAddress(
			web3,
			pairInfo.token0Address
		).then((token0Info) => {
			return TokenInfoFetcher.getTokenInfoFromAddress(
				web3,
				pairInfo.token1Address
			).then((token1Info) => {
				return LiquidityPairFetcher.getFactoryAddressWithPairContract(
					web3,
					pairAddress
				).then((factoryAddress) => {
					const numReserve0In1LPToken =
						(ratioOf1LPToTotalSuppler * pairInfo.reserves.reserve0) /
						10 ** token0Info.decimals;
					const numReserve1In1LPToken =
						(ratioOf1LPToTotalSuppler * pairInfo.reserves.reserve1) /
						10 ** token1Info.decimals;

					return PriceFetcher.getPriceByTokenAddress(
						web3,
						pairInfo.token0Address
					).then((priceToken0) => {
						return PriceFetcher.getPriceByTokenAddress(
							web3,
							pairInfo.token1Address
						).then((priceToken1) => {
							return (
								priceToken0 * numReserve0In1LPToken +
								priceToken1 * numReserve1In1LPToken
							);
						});
					});
				});
			});
		});
	});
};

var isLPToken = function (web3, address) {
	return LiquidityPairFetcher.isTokenAnLPToken(web3, address);
};

var getPriceOfLPTokenFromTokens = function (
	web3,
	factoryAddress,
	tokenA,
	tokenB
) {
	return LiquidityPairFetcher.getPairContractWithTokensAddress(
		web3,
		factoryAddress,
		tokenA,
		tokenB
	).then((pairAddress) => {
		return getPriceOfLPToken(web3, pairAddress);
	});
};

var getAverageAmountDepositedIntoLP = function (
	web3,
	userAddress,
	pairAddress
) {
	return LiquidityPairFetcher.getAmountDepositedIntoPair(
		web3,
		userAddress,
		pairAddress
	);
};

module.exports = {
	getPriceOfLPToken,
	getPriceOfLPTokenFromTokens,
	getAverageAmountDepositedIntoLP,
	isLPToken,
};
