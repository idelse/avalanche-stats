const rpc = require("./rpc");
const { PromiseAllSequential } = require("./promises");
const isPortReachable = require('is-port-reachable');
const { getProviderByIp } = require("./rpc");

async function getOpenPeers(uri, timeout = 10_000) {
    let openPeers = {};
    let closedPeers = {};
    let pendingPeers = {};
    const peersFromRootNode = await rpc.getPeers(uri, timeout);
    const f = pendingPeers => PromiseAllSequential(peersFromRootNode.map(async peer => {
        const host = peer.ip.split(":")[0];
        if (openPeers[host] || closedPeers[host]) return undefined;
        const isOpen = await isPortReachable(9650, { host });
        if (!isOpen) {
            closedPeers[host] = true;
            return undefined;
        }
        const peers = await rpc.getPeers(`http://${host}:9650`, timeout); 
        peers.forEach(p => {
            pendingPeers[p.ip.split(":")[0]] = p;
        });
        if (peers.length > 0) openPeers[host] = { ...peer, host };
        closedPeers[host] = true;
        return undefined;
    }));
    await f(peersFromRootNode);
    await f(Object.keys(pendingPeers).map(k => pendingPeers[k]));
    const validators = await rpc.getValidators(uri, timeout);
    return Object.keys(openPeers).map(k => {
        const v = validators.filter(v => openPeers[k].nodeID === v.nodeID)[0];
        if (!v) return undefined;
        return {
            ...openPeers[k],
            ...v,
            rpc: `http://${openPeers[k].host}:9650`,
            startTime: new Date(parseInt(v.startTime+'000')),
            endTime: new Date(parseInt(v.endTime+'000')),
            stakeAmount: parseFloat(v.stakeAmount),
            uptime: parseFloat(v.uptime),
        }
    }).filter(x => !!x);
}


async function getPeers(uri, cache = true) {
    let res = {};
    if (cache) {
        const peers = require("../database/peers.json")
        return peers;
    }
    const openPeers = await getOpenPeers(uri, 10_000);
    await PromiseAllSequential(openPeers.map(async p => {
        const peers = await rpc.getPeers(p.rpc, 10_000); 
        await PromiseAllSequential(peers.map(async p => {
            try {
                const ip = p.ip.split(":")[0];
                res[ip] = {
                    ...p,
                    ip,
                    provider: await getProviderByIp(ip),
                };
            } catch(error) {
                return undefined;    
            }
        }), 1);
    }))
    return Object.keys(res).map(k => res[k]);
}

async function getUptimeByNode (root, timeout) {

    // 1. get open nodes from https://api.avax.network
    // {
    //     ip: '18.230.73.42:9651',
    //     publicIP: '18.230.73.42:9651',
    //     nodeID: 'NodeID-3nXiWsWPnudsiMubRPAPCM7BzQsTSXdLH',
    //     version: 'avalanche/1.0.0',
    //     lastSent: '2020-09-27T09:11:53Z',
    //     lastReceived: '2020-09-27T09:11:53Z',
    //     host: '18.230.73.42',
    //     startTime: 2020-09-22T23:55:14.000Z,
    //     endTime: 2020-10-10T23:55:14.000Z,
    //     stakeAmount: 2000000000000,
    //     rewardOwner: { locktime: '0', threshold: '1', addresses: [Array] },
    //     potentialReward: '9690753400',
    //     delegationFee: '2.0000',
    //     uptime: 1,
    //     connected: true,
    //     rpc: 'http://18.230.73.42:9650'
    // }
    let openPeers = await getOpenPeers(root, timeout);

    // 2. Decorate nodes with cloud provider
    openPeers = await PromiseAllSequential(openPeers.map(async peer => {
        return {
            ...peer,
            provider: await rpc.getProviderByIp(peer.host),
        };
    }), 1);

    // 2. [openPeer, validators]
    let nodeIDValidators = (await PromiseAllSequential(openPeers.map(async (openPeer) => {
        let validators = await rpc.getValidators(openPeer.rpc, timeout);
        validators = validators.map(v => [v.nodeID, parseFloat(v.uptime)]);
        return [openPeer, validators];
    }))).filter(x => x[1].length > 0);

    let res = {};
    nodeIDValidators.forEach(([openPeer, validators]) => {
        validators.forEach(v => {
            if (!res[v[0]])
                res[v[0]] = {
                    avg: 0,
                    details: [],
                };
            res[v[0]].details.push([openPeer, v[1]]);
            res[v[0]].avg = res[v[0]].details.reduce((prev, curr) => prev+curr[1], 0) / (res[v[0]].details.length);
        });
    });
    return res;
}

module.exports = {
    getUptimeByNode,
    PromiseAllSequential,
    getPeers
};
