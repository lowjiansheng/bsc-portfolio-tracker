const BDollarFinance = require("./bDollarFinance/BDollarFinance");
const CrowFinance = require("./CrowFinance/CrowFinance");
const AutoFarm = require("./AutoFarm/AutoFarm");
const GooseFinance = require("./Goose/Goose");
const PancakeBunny = require("./PancakeBunny/PancakeBunny");
const VikingSwap = require("./VikingSwap/VikingSwap");

function ProtocolFactory(web3, userAddress) {
	this.web3 = web3;

	// all the supported protocols
	this.protocolList = [
		new BDollarFinance.BDollarFinance(this.web3),
		new CrowFinance.CrowFinance(this.web3),
		new AutoFarm.AutoFarm(this.web3),
		new GooseFinance.Goose(this.web3),
		new PancakeBunny.PancakeBunny(this.web3),
		new VikingSwap.VikingSwap(this.web3),
	];

	this.fetchAccountValuesInProtocol = function () {
		let amountLockedInProtocol = [];

		for (let i = 0; i < this.protocolList.length; i++) {
			const protocol = this.protocolList[i];
			amountLockedInProtocol.push(
				protocol
					.getProtocolInformation(userAddress)
					.then((amountInProtocol) => {
						return {
							isSuccess: true,
							amountInProtocol: parseFloat(
								amountInProtocol.totalAmount
							).toFixed(2),
							protocolName: protocol.protocolName,
							totalDeposits: amountInProtocol.totalDeposits,
							pendingEarn: amountInProtocol.pendingEarn,
							protocolInformation: amountInProtocol.protocolInformation,
						};
					})
					.catch((err) => {
						console.log(err);
						return {
							isSuccess: false,
							amountInProtocol: 0.0,
							protocolName: protocol.protocolName,
						};
					})
			);
		}

		Promise.all(amountLockedInProtocol).then((protocolResults) => {
			const totalAmountLocked = protocolResults.reduce(
				(acc, curr) => acc + parseFloat(curr.amountInProtocol),
				0
			);
			const totalValuePendingEarn = protocolResults.reduce(
				(acc, curr) => acc + parseFloat(curr.pendingEarn),
				0
			);
			const totalValueDeposits = protocolResults.reduce(
				(acc, curr) => acc + parseFloat(curr.totalDeposits),
				0
			);
			let result = {
				totalValueLocked: totalAmountLocked,
				totalValuePendingEarn: totalValuePendingEarn, // TODO
				totalValueDeposits: totalValueDeposits, // TODO
				walletAddress: userAddress,
				protocols: protocolResults,
			};

			console.log(JSON.stringify(result, null, 4));
		});
	};
}

module.exports = {
	ProtocolFactory,
};
