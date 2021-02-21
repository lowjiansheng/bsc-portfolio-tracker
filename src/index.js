const Web3 = require("web3")

const ETH_SYMBOL = "BNB"
const BINANCE_RPC = "https://bsc-dataseed1.binance.org:443"

const SECRETS = require("./secrets/secrets")

const ProtocolFactory = require("./ProtocolFactory")

var connectToWeb3 = function() {
    const web3 = new Web3(BINANCE_RPC)
    web3.eth.getBalance(SECRETS.PUBLIC_ADDRESS_TO_TRACK).then((value) => {
        console.log("This address has " + web3.utils.fromWei(value, "ether") + " " + ETH_SYMBOL)
    })
    return web3
}

const web3 = connectToWeb3()

console.log("Start pulling data from the blockchain for address = " + SECRETS.PUBLIC_ADDRESS_TO_TRACK)

let protocolFactory = new ProtocolFactory.ProtocolFactory(web3, SECRETS.PUBLIC_ADDRESS_TO_TRACK)
protocolFactory.fetchAccountValuesInProtocol()
