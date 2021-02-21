const ICrowFarm = require("../../build/contracts/ICrowFarm.json")
const CROW_CONSTANTS = require("./constants")

const LPTokenCalculator = require("../LPTokenCalculator")

function CrowFinance (web3) {

    this.web3 = web3

    this.protocolName = "CrowFinance"

    this.calculateTotalDollarAmountInProtocol = function(userAddress) {
        return this.getLPsParticipated(userAddress).then((participatedLPs) => {
            let participatedLPsPricePromise = []
            participatedLPs.forEach((participatedLP) => {
                //LPTokenCalculator.getAverageAmountDepositedIntoLP(this.web3, userAddress, participatedLP.lpToken)
                participatedLPsPricePromise.push(LPTokenCalculator.getPriceOfLPToken(this.web3, participatedLP.lpToken).then((pricePerLPToken) => {
                    return (participatedLP.amount / (10 ** 18)) * pricePerLPToken
                }))
            })
            return Promise.all(participatedLPsPricePromise).then((totalAmountInLP) => {
                return totalAmountInLP.reduce((acc, currentValue) => acc + currentValue)
            })
        })
    }

    this.getLPsParticipated = function(userAddress) {
        let contract = new this.web3.eth.Contract(ICrowFarm, CROW_CONSTANTS.CROW_FARM_ADDRESS)
        return contract.methods.poolLength().call().then((poolLength) => {
            let poolInfoRequests = []
            for (let i = 0; i < poolLength; i++) {
                poolInfoRequests.push(contract.methods.userInfo(i, userAddress).call())
            }
            return Promise.all(poolInfoRequests).then((userPoolInfos) => {
                let participatedPoolInfoPromise = []
                for (let i = 0 ; i < poolLength; i++) { 
                    if (userPoolInfos[i].amount !== "0") {
                        participatedPoolInfoPromise.push(contract.methods.poolInfo(i).call().then((poolInfo) => {
                            poolInfo.amount = userPoolInfos[i].amount
                            poolInfo.rewardDebt = userPoolInfos[i].rewardDebt
                            return poolInfo
                        }))
                    }    
                }
                return Promise.all(participatedPoolInfoPromise)
            })
        })
    }

}

module.exports = {
    CrowFinance
}