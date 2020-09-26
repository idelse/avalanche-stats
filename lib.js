const isPortReachable = require('is-port-reachable');
const fetch = require("node-fetch");
const AVA_NODE_URI = "https://api.avax.network";

let openNodes = {};

const post = (uri, body) => {
    return fetch(uri, {
        method: 'post',
        body: JSON.stringify(body),
        timeout: 10000,
        headers: {
            'Content-Type': 'application/json'
        },
    })
    .then(res => res.json())
    .then(res => {
        if (res && res.result) {
            return res;
        }
        return [];
    })
    .catch(() => []);
}

const getValidators = async (uri) => {
    const resultGetCurrentValidators = await post(`${uri}/ext/P`, {
        id: 1,
        jsonrpc: "2.0",
        method: "platform.getCurrentValidators",
        params: {
            subnetID: "11111111111111111111111111111111LpoYY"
        },
    }).then(res => {
        if (res && res.result && res.result.validators)
            return res.result.validators;
        return [];
    });
    return resultGetCurrentValidators;
}

const getPeers = async (uri) => {
    const resultPeers = await post(`${uri}/ext/info`, {
        jsonrpc: "2.0",
        id: 1,
        method: "info.peers",
        params: {}
    }).then(res => {
        if (res && res.result && res.result.peers)
            return res.result.peers;
        return [];
    });
    return resultPeers;
}


function chunk (arr, len) {
    var chunks = [],
        i = 0,
        n = arr.length;
  
    while (i < n) {
      chunks.push(arr.slice(i, i += len));
    }
    return chunks;
}

const sleep = (t) => new Promise((r) => {
    setTimeout(() => {
        r();
    }, t);
});

const PromiseAllSequential = async (promises, concurrently = 100, timeout = 100) => {
    promises = chunk(promises, concurrently);
    const results = [];
    for(let i = 0; i < promises.length; i++) {
        results.push(...await(Promise.all(promises[i])));
        await sleep(timeout);
    }
    return results;
}

async function updateOpenNodes(uri = AVA_NODE_URI) {
    const peers = await getPeers(uri);
    let promises = [];
    for (let i = 0; i < peers.length; i++) {
        const host = peers[i].ip.split(":")[0];
        promises.push((async () => {
            const isOpen = await isPortReachable(9650, { host });
            const peers = await getPeers(`http://${host}:9650`); 
            if (isOpen && peers.length > 0) return { ...peers[i], host };
            return undefined;
        })());
    }
    (await PromiseAllSequential(promises)).filter(x => x !== undefined).forEach(peer => {
        let key = peer.nodeID;
        if (key === undefined)
            key = peer.host;
        else
            key += ` (${peer.host})`;
        openNodes[key] = peer
    });
}

function getOpenNodeIdAndIps() {
    return Object.keys(openNodes).map(k => [k, `http://${openNodes[k].host}:9650`]);   
}

async function execute () {

    // 1. get open nodes from https://api.avax.network
    await updateOpenNodes();

    // 2. get open nodes from open nodes
    await PromiseAllSequential(getOpenNodeIdAndIps().map(async ([_, host]) => {
        return updateOpenNodes(host);
    }));

    // 3. retrieve validators from open nodes
    const openNodes = getOpenNodeIdAndIps();
    let nodeIDValidators = await PromiseAllSequential(openNodes.map(async ([nodeID, host]) => {
        let validators = await getValidators(host);
        validators = validators.map(v => [v.nodeID, parseFloat(v.uptime)]);
        return [nodeID, validators];
    }));
    nodeIDValidators = nodeIDValidators.filter(x => x[1].length > 0);
    let res = {};
    nodeIDValidators.forEach(([nodeID, validators]) => {
        validators.forEach(v => {
            if (!res[v[0]])
                res[v[0]] = {
                    avg: 0,
                    details: [],
                };
            res[v[0]].details.push([nodeID, v[1]]);
            res[v[0]].avg = res[v[0]].details.reduce((prev, curr) => prev+curr[1], 0) / (res[v[0]].details.length);
        });
    });
    return res;
}

module.exports = execute;
