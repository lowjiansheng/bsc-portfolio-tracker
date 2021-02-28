let calculatePoolDeposits = function (
	userTransactions,
	AUTOFARM_CONTRACT,
	TOKEN_CONTRACT
) {
	const depositTransactions = userTransactions.result
		.filter((result) => {
			return (
				result.to.toLowerCase() === AUTOFARM_CONTRACT.toLowerCase() &&
				result.contractAddress.toLowerCase() === TOKEN_CONTRACT.toLowerCase()
			);
		})
		.reduce((acc, curr) => acc + parseFloat(curr.value), 0);

	const withdrawalTransactions = userTransactions.result
		.filter((result) => {
			return (
				result.from.toLowerCase() === AUTOFARM_CONTRACT.toLowerCase() &&
				result.contractAddress.toLowerCase() === TOKEN_CONTRACT.toLowerCase()
			);
		})
		.reduce((acc, curr) => acc + curr.value, 0);

	const amountDeposited = depositTransactions - withdrawalTransactions;
	return amountDeposited < 0 ? 0 : amountDeposited;
};

module.exports = {
	calculatePoolDeposits,
};
