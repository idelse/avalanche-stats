const lib = require("./libs/lib");

module.exports = {
    getOpenNodes: rpc => lib.getOpenPeers(rpc).then(res => {
        return res.map(validator => ({
            ip: validator.host,
            rpc: validator.rpc,
            nodeID: validator.nodeID,
        }));
    })
}
