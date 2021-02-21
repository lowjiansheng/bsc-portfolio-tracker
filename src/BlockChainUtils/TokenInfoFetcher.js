const ERC20 = require("../../build/contracts/IERC20.json");
const PriceFetcher = require("./PriceFetcher");

let getTokenInfoWithPriceFromAddress = function (web3, tokenAddress) {
	return getTokenInfoFromAddress(web3, tokenAddress).then((tokenInfo) => {
		return PriceFetcher.getPriceByTokenAddress(web3, tokenAddress).then(
			(tokenPrice) => {
				return {
					decimals: tokenInfo.decimals,
					symbol: tokenInfo.symbol,
					pricePerToken: tokenPrice,
				};
			}
		);
	});
};

var getTokenInfoFromAddress = function (web3, address) {
	var contract = new web3.eth.Contract(ERC20["abi"], address);
	return contract.methods
		.symbol()
		.call()
		.then((symbol) => {
			return contract.methods
				.decimals()
				.call()
				.then((decimals) => {
					return {
						symbol: symbol,
						decimals: decimals,
					};
				});
		});
};

module.exports = {
	getTokenInfoWithPriceFromAddress,
	getTokenInfoFromAddress,
};
