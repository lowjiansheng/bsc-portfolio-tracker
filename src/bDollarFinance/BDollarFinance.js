const IBdoBoardRoom = require("../../build/contracts/IBdoBoardRoom.json");
const BDO_CONSTANTS = require("./constants");

const BDOLiquidityPool = require("./LiquidityPool");

const TokenInfoFetcher = require("../BlockChainUtils/TokenInfoFetcher");
const PriceFetcher = require("../BlockChainUtils/PriceFetcher");

function BDollarFinance(web3) {
	// There's only 3 pools in BDO
	this.poolLength = 3;

	this.protocolName = "BDollarFinance";

	this.web3 = web3;

	this.getProtocolInformation = function (userAddress) {
		return BDOLiquidityPool.calculateAmountInLP(
			this.web3,
			userAddress,
			this.poolLength
		).then((LPValue) => {
			return this.calculateAmountInBoardRoomStakes(userAddress).then(
				(stakeValue) => {
					return {
						totalAmount: LPValue.amountInLP + stakeValue.totalAmount,
						totalDeposits: stakeValue.amountsBDOStaked + LPValue.amountInLP, // TODO: add LP value stake
						pendingEarn: stakeValue.amountBDOEarned,
						protocolInformation: {
							boardRoomInformation: stakeValue,
							lpInformation: LPValue,
						},
					};
				}
			);
		});
	};

	this.calculateAmountInBoardRoomStakes = function (userAddress) {
		return this.getBoardRoomInformation(userAddress).then((boardRoomStakes) => {
			return TokenInfoFetcher.getTokenInfoFromAddress(
				this.web3,
				BDO_CONSTANTS.BDO_TOKEN_CONTRACT
			).then((bdoInfo) => {
				return TokenInfoFetcher.getTokenInfoFromAddress(
					this.web3,
					BDO_CONSTANTS.sBDO_TOKEN_CONTRACT
				).then((sBDOInfo) => {
					return PriceFetcher.getPriceByTokenAddress(
						this.web3,
						BDO_CONSTANTS.BDO_TOKEN_CONTRACT
					).then((bdoPrice) => {
						return PriceFetcher.getPriceByTokenAddress(
							this.web3,
							BDO_CONSTANTS.sBDO_TOKEN_CONTRACT
						).then((sBDOPrice) => {
							const amountOfsBDO =
								boardRoomStakes.sBDOBalance / 10 ** sBDOInfo.decimals;
							const amountOfBDO =
								boardRoomStakes.BDOEarned / 10 ** bdoInfo.decimals;
							return {
								totalAmount: amountOfBDO * bdoPrice + amountOfsBDO * sBDOPrice,
								amountsBDOStaked: amountOfsBDO,
								amountBDOEarned: amountOfBDO,
							};
						});
					});
				});
			});
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
