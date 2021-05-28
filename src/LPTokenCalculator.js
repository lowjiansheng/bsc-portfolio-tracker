const PriceFetcher = require("./BlockChainUtils/PriceFetcher");
const LiquidityPairFetcher = require("./BlockChainUtils/LiquidityPairFetcher");
const TokenInfoFetcher = require("./BlockChainUtils/TokenInfoFetcher");

var getPriceOfLPToken = function (web3, pairAddress, accountTransactions) {
	return LiquidityPairFetcher.getPairInformationWithPairAddress(
		web3,
		pairAddress,
		accountTransactions
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

					const totalLPSupplyDeposited =
						pairInfo.totalLPTokenReceived / 10 ** pairInfo.lpDecimals;
					console.log(totalLPSupplyDeposited);

					const numReserve0In1LPTokenInitialDeposit =
						(totalLPSupplyDeposited * pairInfo.amountToken0Deposited) /
						10 ** token0Info.decimals;
					const numReserve1In1LPTokenInitialDeposit =
						(totalLPSupplyDeposited * pairInfo.amountToken1Deposited) /
						10 ** token1Info.decimals;

					return PriceFetcher.getPriceByTokenAddress(
						web3,
						pairInfo.token0Address
					).then((priceToken0) => {
						return PriceFetcher.getPriceByTokenAddress(
							web3,
							pairInfo.token1Address
						).then((priceToken1) => {
							const priceOfLPTokenDeposit =
								priceToken0 * numReserve0In1LPTokenInitialDeposit +
								priceToken1 * numReserve1In1LPTokenInitialDeposit;

							return {
								currentLPTokenPrice:
									priceToken0 * numReserve0In1LPToken +
									priceToken1 * numReserve1In1LPToken,
								depositedLPTokenPrice: priceOfLPTokenDeposit,
							};
						});
					});
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
};
