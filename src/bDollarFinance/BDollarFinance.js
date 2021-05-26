const IBdoBoardRoom = require("../../build/contracts/IBdoBoardRoom.json");
const BDO_CONSTANTS = require("./constants");

const BDOLiquidityPool = require("./SharesBank");
const BDOBoardroom = require("./Boardroom");

const TokenInfoFetcher = require("../BlockChainUtils/TokenInfoFetcher");
const PriceFetcher = require("../BlockChainUtils/PriceFetcher");

function BDollarFinance(web3) {
	// There's only 3 pools in BDO
	this.poolLength = 3;

	this.protocolName = "BDollarFinance";

	this.web3 = web3;

	this.getProtocolInformation = function (userAddress, accountTransactions) {
		return TokenInfoFetcher.getTokenInfoWithPriceFromAddress(
			this.web3,
			BDO_CONSTANTS.sBDO_TOKEN_CONTRACT
		).then((BDOSharesInfo) => {
			return TokenInfoFetcher.getTokenInfoWithPriceFromAddress(
				this.web3,
				BDO_CONSTANTS.BDO_TOKEN_CONTRACT
			).then((BDOInfo) => {
				return BDOLiquidityPool.getLPInformation(
					this.web3,
					userAddress,
					this.poolLength,
					BDOSharesInfo
				).then((lpInformation) => {
					return this.calculateAmountInBoardRoomStakes(
						userAddress,
						BDOSharesInfo,
						BDOInfo
					).then((stakeValue) => {
						return {
							totalAmount: lpInformation.amountInLP + stakeValue.totalAmount,
							totalDeposits:
								stakeValue.valueBDOSharesStaked + lpInformation.amountInLP,
							pendingEarn:
								stakeValue.valueBDOEarned + lpInformation.valuePendingShare,
							protocolInformation: {
								boardRoomInformation: stakeValue,
								lpInformation: lpInformation,
							},
						};
					});
				});
			});
		});
	};

	// TODO: remove away these methods
	this.calculateAmountInBoardRoomStakes = function (
		userAddress,
		BDOSharesInfo,
		BDOInfo
	) {
		return this.getBoardRoomInformation(userAddress).then((boardRoomStakes) => {
			const amountOfsBDO =
				boardRoomStakes.sBDOBalance / 10 ** BDOSharesInfo.decimals;
			const amountOfBDO = boardRoomStakes.BDOEarned / 10 ** BDOInfo.decimals;
			return {
				totalAmount:
					amountOfBDO * BDOInfo.pricePerToken +
					amountOfsBDO * BDOSharesInfo.pricePerToken,
				amountBDOSharesStaked: amountOfsBDO,
				valueBDOSharesStaked: amountOfsBDO * BDOSharesInfo.pricePerToken,
				amountBDOEarned: amountOfBDO,
				valueBDOEarned: amountOfBDO * BDOInfo.pricePerToken,
			};
		});
	};

	// users are able to stake their sBDO shares to earn BDOs according to bDollar's protocol
	this.getBoardRoomInformation = function (userAddress) {
		let contract = new this.web3.eth.Contract(
			IBdoBoardRoom,
			BDO_CONSTANTS.BDO_BOARDROOM_STAKE_CONTRACT
		);
		return contract.methods
			.balanceOf(userAddress)
			.call()
			.then((userBalance) => {
				return contract.methods
					.earned(userAddress)
					.call()
					.then((earned) => {
						return {
							sBDOBalance: userBalance,
							BDOEarned: earned,
						};
					});
			});
	};
}

module.exports = {
	BDollarFinance,
};
