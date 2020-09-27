# avalanche-stats
This script provides an average uptime of an avalanche node from the perspective of a subset of the network.

[![asciicast](https://asciinema.org/a/BZYLFB4w8WfMkf1ZicLomqMGe.svg)](https://asciinema.org/a/BZYLFB4w8WfMkf1ZicLomqMGe)

## How this script works?
It inspects the avalanche network, looking for nodes with `9650` port open. Then it retrieves the uptime of each validators from this open nodes, providing an average uptime from the perspective of a subset of the network.

## How to install
```
npm i -g avalanche-stats
```

## How to use
```
avalanche-stats uptime-by-nodeId <NodeID> [timeout]
```
```
avalanche-stats uptime-by-nodeId NodeID-Js3ahWihoTLJWTrWzpth9mttniJNuyoki
```
```
avalanche-stats get-peers
```

## Donations
Consider supporting this project by donating to `X-avax1rc0jdc0xvj7damvvf6wne7zy3kjssazzwck8qa`

## Useful Links
- [idelse on twitter](https://twitter.com/idelseresearch)
