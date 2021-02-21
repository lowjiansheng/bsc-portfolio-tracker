const BDollarFinance = require("./bDollarFinance/BDollarFinance")
const CrowFinance = require("./CrowFinance/CrowFinance")
const AutoFarm = require('./AutoFarm/AutoFarm')
const GooseFinance = require("./Goose/Goose")

function ProtocolFactory(web3, userAddress) { 

    this.web3 = web3

    // all the supported protocols
    this.protocolList = [
        new BDollarFinance.BDollarFinance(this.web3),
        new CrowFinance.CrowFinance(this.web3),
        new AutoFarm.AutoFarm(this.web3),
        new GooseFinance.Goose(this.web3)
    ]

    this.fetchAccountValuesInProtocol = function() {
        let amountLockedInProtocol = []
        
        for (let i = 0 ; i < this.protocolList.length; i++) {
            const protocol = this.protocolList[i]
            amountLockedInProtocol.push(
                protocol.calculateTotalDollarAmountInProtocol(userAddress)
                .then((amountInProtocol) => {
                    return {
                        isSuccess: true,
                        amountInProtocol: parseFloat(amountInProtocol).toFixed(2),
                        protocolName: protocol.protocolName
                    }
                })
                .catch(() => {
                    return {
                        isSuccess: false,
                        amountInProtocol: 0.0,
                        protocolName: protocol.protocolName
                    }
                })
            )
        } 
 
        Promise.all(amountLockedInProtocol).then((amountLockedInProtocols) => {
            console.log(amountLockedInProtocols)
            const totalAmountLocked = amountLockedInProtocols.reduce((acc, curr) => acc + parseFloat(curr.amountInProtocol), 0)
            console.log("Total amount locked in protocols = US$" + totalAmountLocked)
        })
    }
}

module.exports = {
    ProtocolFactory
}