const ERC20 = require("../../build/contracts/IERC20.json");

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
	getTokenInfoFromAddress,
};
