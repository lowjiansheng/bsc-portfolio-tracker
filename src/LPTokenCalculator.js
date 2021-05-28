const PriceFetcher = require("./BlockChainUtils/PriceFetcher");
const LiquidityPairFetcher = require("./BlockChainUtils/LiquidityPairFetcher");
const TokenInfoFetcher = require("./BlockChainUtils/TokenInfoFetcher");

var getPriceOfLPToken = function (web3, pairAddress, accountTransactions) {
	return LiquidityPairFetcher.getPairInformationWithPairAddress(
		web3,
		pairAddress
	).then((pairInfo) => {
		const totalLPSupply = pairInfo.lpTotalSupply / 10 ** pairInfo.lpDecimals;
		const ratioOf1LPToTotalSuppler = 1 / totalLPSupply;
		// TODO: Calculate average deposited token amount
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

var calculateImpermanantLoss = function (
	web3,
	totalAmountDeposit,
	userAddress,
	pairAddress,
	addressTransactions,
	totalValueAmount
) {
	return LiquidityPairFetcher.getPairInformationWithPairAddress(
		web3,
		pairAddress
	).then((pairInfo) => {
		return PriceFetcher.getPriceByTokenAddress(
			web3,
			pairInfo.token0Address
		).then((priceToken0) => {
			return PriceFetcher.getPriceByTokenAddress(
				web3,
				pairInfo.token1Address
			).then((priceToken1) => {
				return LiquidityPairFetcher.getAmountDepositedIntoPair(
					web3,
					userAddress,
					pairAddress,
					addressTransactions,
					pairInfo.token0Address,
					pairInfo.token1Address
				).then((amountDeposited) => {
					const amountLPTokenReceived =
						amountDeposited.totalLPTokenReceived / 10 ** pairInfo.lpDecimals;
					// TODO: should do an averaging or something. what if the same pair is split
					// in different pools? that would not work in this scenario.
					if (totalAmountDeposit !== amountLPTokenReceived) {
						console.log(
							"this account did not deposit the full amount of lp tokens"
						);
						return 0;
					}
					const totalValueDeposited =
						(amountDeposited.totalToken0 / 10 ** 18) * priceToken0 +
						(amountDeposited.totalToken1 / 10 ** 18) * priceToken1;
					const impermanantLoss =
						((totalValueAmount - totalValueDeposited) / totalValueAmount) * 100;
					return impermanantLoss;
				});
			});
		});
	});
};

// This is not a very efficient method and should therefore be refrained from being called
var isLPToken = function (web3, address) {
	return LiquidityPairFetcher.isTokenAnLPToken(web3, address);
};

var getPriceOfLPTokenFromTokens = function (
	web3,
	factoryAddress,
	tokenA,
	tokenB,
	addressTransactions
) {
	return LiquidityPairFetcher.getPairContractWithTokensAddress(
		web3,
		factoryAddress,
		tokenA,
		tokenB
	).then((pairAddress) => {
		return getPriceOfLPToken(web3, pairAddress, addressTransactions);
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
	calculateImpermanantLoss,
};
