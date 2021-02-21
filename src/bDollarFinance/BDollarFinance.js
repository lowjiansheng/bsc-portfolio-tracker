const IBdoSharesFarm = require("../../build/contracts/IBdoSharesFarm.json");
const IBdoBoardRoom = require("../../build/contracts/IBdoBoardRoom.json");
const BDO_CONSTANTS = require("./constants");

const LPTokenCalculator = require("../LPTokenCalculator");

const TokenInfoFetcher = require("../BlockChainUtils/TokenInfoFetcher");
const PriceFetcher = require("../BlockChainUtils/PriceFetcher");

function BDollarFinance(web3) {
	// There's only 3 pools in BDO
	this.poolLength = 3;

	this.protocolName = "BDollarFinance";

	this.web3 = web3;

	this.getProtocolInformation = function (userAddress) {
		return this.calculateAmountInLP(userAddress).then((LPValue) => {
			return this.calculateAmountInBoardRoomStakes(userAddress).then(
				(stakeValue) => {
					return {
						totalAmount: LPValue.amountInLP + stakeValue.totalAmount,
						totalDeposits: stakeValue.amountsBDOStaked + LPValue.amountInLP, // TODO: add LP value stake
						pendingEarn: stakeValue.amountBDOEarned,
						boardRoomInformation: stakeValue,
						lpInformation: LPValue,
					};
				}
			);
		});
	};

	this.calculateAmountInLP = function (userAddress) {
		return this.getLPsParticipated(userAddress).then((participatedLPs) => {
			let participatedLPsPricePromise = [];
			participatedLPs.forEach((participatedLP) => {
				participatedLPsPricePromise.push(
					LPTokenCalculator.getPriceOfLPToken(
						this.web3,
						participatedLP.lpToken
					).then((pricePerLPToken) => {
						return {
							amountInLP: (participatedLP.amount / 10 ** 18) * pricePerLPToken,
							lpPendingShare: participatedLP.pendingShare,
						};
					})
				);
			});
			return Promise.all(participatedLPsPricePromise).then(
				(totalAmountInLP) => {
					return {
						amountInLP: totalAmountInLP.reduce(
							(acc, currentValue) => acc + currentValue.amountInLP,
							0
						),
						lpPendingShare: totalAmountInLP.lpPendingShare,
					};
				}
			);
		});
	};

	// returns all the corresponding information of the participated LP pools
	this.getLPsParticipated = function (userAddress) {
		let contract = new this.web3.eth.Contract(
			IBdoSharesFarm,
			BDO_CONSTANTS.BDO_SHARE_POOL_CONTRACT
		);
		let poolInfoRequests = [];
		for (let i = 0; i < this.poolLength; i++) {
			poolInfoRequests.push(contract.methods.userInfo(i, userAddress).call());
		}
		return Promise.all(poolInfoRequests).then((userPoolInfos) => {
			let participatedPoolInfoPromise = [];
			for (let i = 0; i < this.poolLength; i++) {
				if (userPoolInfos[i].amount !== "0") {
					participatedPoolInfoPromise.push(
						contract.methods
							.poolInfo(i)
							.call()
							.then((poolInfo) => {
								return contract.methods
									.pendingShare(i, userAddress)
									.call()
									.then((pendingShare) => {
										poolInfo.amount = userPoolInfos[i].amount;
										poolInfo.pendingShare = pendingShare;
										poolInfo.rewardDebt = userPoolInfos[i].rewardDebt;
										return poolInfo;
									});
							})
					);
				}
			}
			return Promise.all(participatedPoolInfoPromise);
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
