const IBdoBoardRoom = require("../../build/contracts/IBdoBoardRoom.json");

const TokenInfoFetcher = require("../BlockChainUtils/TokenInfoFetcher");
const PriceFetcher = require("../BlockChainUtils/PriceFetcher");
const BDO_CONSTANTS = require("./constants");

let calculateAmountInBoardRoomStakes = function (web3, userAddress) {
	return getBoardRoomInformation(userAddress).then((boardRoomStakes) => {
		return TokenInfoFetcher.getTokenInfoFromAddress(
			web3,
			BDO_CONSTANTS.BDO_TOKEN_CONTRACT
		).then((bdoInfo) => {
			return TokenInfoFetcher.getTokenInfoFromAddress(
				web3,
				BDO_CONSTANTS.sBDO_TOKEN_CONTRACT
			).then((sBDOInfo) => {
				return PriceFetcher.getPriceByTokenAddress(
					web3,
					BDO_CONSTANTS.BDO_TOKEN_CONTRACT
				).then((bdoPrice) => {
					return PriceFetcher.getPriceByTokenAddress(
						web3,
						BDO_CONSTANTS.sBDO_TOKEN_CONTRACT
					).then((sBDOPrice) => {
						const amountOfsBDO =
							boardRoomStakes.sBDOBalance / 10 ** sBDOInfo.decimals;
						const amountOfBDO =
							boardRoomStakes.BDOEarned / 10 ** bdoInfo.decimals;
						return {
							totalAmount: amountOfBDO * bdoPrice + amountOfsBDO * sBDOPrice,
							amountsBDOStaked: amountOfsBDO,
							valuesBDOStaked: amountOfsBDO * sBDOPrice,
							amountBDOEarned: amountOfBDO,
							valueBDOEarned: amountOfBDO * bdoPrice,
						};
					});
				});
			});
		});
	});
};

let getBoardRoomInformation = function (web3, userAddress) {
	let contract = new web3.eth.Contract(
		IBdoBoardRoom,
		BDO_CONSTANTS.BDO_BOARDROOM_STAKE_CONTRACT
	);
	return contract.methods
		.balanceOf(userAddress)
		.call()
		.then((userBalance) => {
			console.log(userBalance);
			return contract.methods
				.earned(userAddress)
				.call()
				.then((earned) => {
					return {
						sBDOBalance: userBalance,
						BDOEarned: earned,
					};
				})
				.catch(() => {
					console.log("error fetching user balance");
				});
		})
		.catch(() => {
			console.log("error fetching user balance");
		});
};

module.exports = {
	calculateAmountInBoardRoomStakes,
};
