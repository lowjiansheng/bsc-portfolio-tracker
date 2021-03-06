const IBdoSharesFarm = require("../../build/contracts/IBdoSharesFarm.json");
const BDO_CONSTANTS = require("./constants");

const LPTokenCalculator = require("../LPTokenCalculator");

let getLPInformation = function (web3, userAddress, poolLength, BDOSharesInfo) {
	return getLPsParticipated(web3, userAddress, poolLength).then(
		(participatedLPs) => {
			let participatedLPsPricePromise = [];
			participatedLPs.forEach((participatedLP) => {
				participatedLPsPricePromise.push(
					LPTokenCalculator.getPriceOfLPToken(
						web3,
						participatedLP.lpToken
					).then((pricePerLPToken) => {
						const pendingShareAmount =
							participatedLP.pendingShare / 10 ** BDOSharesInfo.decimals;
						return {
							amountInLP:
								(participatedLP.amount / 10 ** BDOSharesInfo.decimals) *
								pricePerLPToken,
							pendingShare: pendingShareAmount,
							valuePendingShare:
								pendingShareAmount * BDOSharesInfo.pricePerToken,
						};
					})
				);
			});
			return Promise.all(participatedLPsPricePromise).then(
				(totalAmountInLP) => {
					const pendingShareAmount = totalAmountInLP.reduce(
						(acc, currentValue) => acc + currentValue.pendingShare,
						0
					);
					return {
						amountInLP: totalAmountInLP.reduce(
							(acc, currentValue) => acc + currentValue.amountInLP,
							0
						),
						pendingShare: pendingShareAmount,
						valuePendingShare: pendingShareAmount * BDOSharesInfo.pricePerToken,
						banksParticipated: totalAmountInLP,
					};
				}
			);
		}
	);
};

let getLPsParticipated = function (web3, userAddress, poolLength) {
	let contract = new web3.eth.Contract(
		IBdoSharesFarm,
		BDO_CONSTANTS.BDO_SHARE_POOL_CONTRACT
	);
	let poolInfoRequests = [];
	for (let i = 0; i < poolLength; i++) {
		poolInfoRequests.push(contract.methods.userInfo(i, userAddress).call());
	}
	return Promise.all(poolInfoRequests).then((userPoolInfos) => {
		let participatedPoolInfoPromise = [];
		for (let i = 0; i < poolLength; i++) {
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

module.exports = {
	getLPInformation,
};
