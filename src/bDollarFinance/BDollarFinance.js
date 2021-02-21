const IBdoSharesFarm = require("../../build/contracts/IBdoSharesFarm.json")
const IBdoBoardRoom = require("../../build/contracts/IBdoBoardRoom.json")
const BDO_CONSTANTS = require("./constants") 

const LPTokenCalculator = require("../LPTokenCalculator")

const TokenInfoFetcher = require("../BlockChainUtils/TokenInfoFetcher")
const PriceFetcher = require("../BlockChainUtils/PriceFetcher")

function BDollarFinance (web3) {
    // There's only 3 pools in BDO
    this.poolLength = 3
    
    this.protocolName = "BDollarFinance"

    this.web3 = web3

    this.calculateTotalDollarAmountInProtocol = function(userAddress) {
        return this.sumUpProtocolValue(this.calculateAmountInLP(userAddress), this.calculateAmountInBoardRoomStakes(userAddress))
    }

    this.calculateAmountInLP = function(userAddress) {
        return this.getLPsParticipated(userAddress).then((participatedLPs) => {
            let participatedLPsPricePromise = []
            participatedLPs.forEach((participatedLP) => {
                LPTokenCalculator.getAverageAmountDepositedIntoLP(this.web3, userAddress, participatedLP.lpToken)
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
        let contract = new this.web3.eth.Contract(IBdoSharesFarm, BDO_CONSTANTS.BDO_SHARE_POOL_CONTRACT)
        let poolInfoRequests = []
        for (let i = 0 ; i < this.poolLength; i++) {
            poolInfoRequests.push(contract.methods.userInfo(i, userAddress).call())
        }
        return Promise.all(poolInfoRequests).then((userPoolInfos) => {
            let participatedPoolInfoPromise = []
            for (let i = 0; i < this.poolLength; i++) {
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
    }

    this.sumUpProtocolValue = function(valueFromLP, valueFromStake) {
        return valueFromLP.then((LPValue) => {
            return valueFromStake.then((stakeValue) => {
                return (LPValue + stakeValue)
            })
        })
    }

    this.calculateAmountInBoardRoomStakes = function(userAddress) {
        return this.getBoardRoomStakes(userAddress).then((boardRoomStakes) => {
            return TokenInfoFetcher.getTokenInfoFromAddress(this.web3, BDO_CONSTANTS.BDO_TOKEN_CONTRACT).then((bdoInfo) => {
                return TokenInfoFetcher.getTokenInfoFromAddress(this.web3, BDO_CONSTANTS.sBDO_TOKEN_CONTRACT).then((sBDOInfo) => {
                    return PriceFetcher.getPriceByTokenAddress(this.web3, BDO_CONSTANTS.BDO_TOKEN_CONTRACT).then((bdoPrice) => {
                        return PriceFetcher.getPriceByTokenAddress(this.web3, BDO_CONSTANTS.sBDO_TOKEN_CONTRACT).then((sBDOPrice) => {
                            const amountOfsBDO = (boardRoomStakes.sBDOBalance / (10 ** sBDOInfo.decimals))
                            const amountOfBDO = (boardRoomStakes.BDOEarned / (10 ** bdoInfo.decimals))
                            return (amountOfBDO * bdoPrice + amountOfsBDO * sBDOPrice)
                        })
                    })
                })
            })
        })        
    }

    // users are able to stake their sBDO shares to earn BDOs according to bDollar's protocol
    this.getBoardRoomStakes = function(userAddress) {
        let contract = new this.web3.eth.Contract(IBdoBoardRoom, BDO_CONSTANTS.BDO_BOARDROOM_STAKE_CONTRACT)
        return contract.methods.balanceOf(userAddress).call().then((userBalance) => {
            return contract.methods.earned(userAddress).call().then((earned) => {
                return {
                    sBDOBalance: userBalance,
                    BDOEarned: earned
                }
            })
        })
    }
}

module.exports = {
    BDollarFinance
}