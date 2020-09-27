const fetch = require("node-fetch");
const whois = require('whois-json');
const fs = require("fs");
const path = require("path");

const renameProvider = provider => {
    if (/AMAZO/.test(provider)) provider = 'AMAZON';
    if (/DIGITALOCEAN/.test(provider)) provider = 'DIGITALOCEAN';
    if (/GOOG/.test(provider)) provider = 'GOOGLE';
    if (/OVH/.test(provider)) provider = 'OVH';
    if (/LINODE/.test(provider)) provider = 'LINODE';
    if (/HETZNER/.test(provider)) provider = 'HETZNER';
    if (/FASTWEB/.test(provider)) provider = 'FASTWEB';
    if (/FASTWEB/.test(provider)) provider = 'FASTWEB';
    return provider;
}

const getProviderByIp = async ip => {
    let cloudByIp = require("../database/cloud-by-ip.json");
    if (cloudByIp[ip]) {
        cloudByIp[ip].provider = renameProvider(cloudByIp[ip].provider);
        return cloudByIp[ip];
    }
    const { netName, netname } = await whois(ip);
    let provider = netName || netname || 'unknown';
    cloudByIp[ip] = provider;
    fs.writeFileSync(path.join(__dirname, "../database/cloud-by-ip.json"), JSON.stringify(cloudByIp)); 
    return provider;
}

const post = (uri, body, timeout) => {
    return fetch(uri, {
        method: 'post',
        body: JSON.stringify(body),
        timeout,
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

const getValidators = async (uri, timeout) => {
    const resultGetCurrentValidators = await post(`${uri}/ext/P`, {
        id: 1,
        jsonrpc: "2.0",
        method: "platform.getCurrentValidators",
        params: {
            subnetID: "11111111111111111111111111111111LpoYY"
        },
    }, timeout).then(res => {
        if (res && res.result && res.result.validators)
            return res.result.validators;
        return [];
    });
    return resultGetCurrentValidators;
}

const getPeers = async (uri, timeout) => {
    const resultPeers = await post(`${uri}/ext/info`, {
        jsonrpc: "2.0",
        id: 1,
        method: "info.peers",
        params: {}
    }, timeout).then(res => {
        if (res && res.result && res.result.peers)
            return res.result.peers;
        return [];
    });
    return resultPeers;
}


module.exports = { getPeers, getValidators, getProviderByIp };
