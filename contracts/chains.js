export default [
    {
        "name": "polygon",
        "provider": "wss://ws-matic-mainnet.chainstacklabs.com",
        "tokens": [
            {
                "name": "aave",
                "abi": "erc20",
                "address": "0xD6DF932A45C0f255f85145f286eA0b292B21C90B"
            },
            {
                "name": "cel",
                "abi": "erc20",
                "address": "0xd85d1e945766fea5eda9103f918bd915fbca63e6"
            }
        ],
        "exchanges": [
            {
                "name": "quickswap",
                "factory": {
                    "abi": "iuniswapv2-factory-abi",
                    "address": "0x5757371414417b8c6caad45baef941abc7d3ab32"
                },
                "usdt": {
                    "name": "usdt",
                    "abi": "erc20",
                    "address": "0xc2132d05d31c914a87c6611c10748aeb04b58e8f"
                },
                "eth": {
                    "name": "eth",
                    "abi": "erc20",
                    "address": "0x7ceb23fd6bc0add59e62ac25578270cff1b9f619"
                }
            }
        ]
    },
    {
        "name": "ethereum",
        "provider": "wss://mainnet.infura.io/ws/v3/b42c54ee5023450ca91df647b55060a5",
        "tokens": [
            {
                "name": "aave",
                "abi": "erc20",
                "address": "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9"
            }
        ],
        "exchanges": [],
        "lending": {
            "aave": {
                "abi": "aave-lending-abi",
                "address": "0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9",
                "eth": "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
            }
        }
    },
    {
        "name": "bsc",
        "provider": "wss://bsc-ws-node.nariox.org:443",
        "tokens": [
            {
                "name": "cake",
                "abi": "bep20",
                "address": "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82"
            },
            {
                "name": "comp",
                "abi": "bep20",
                "address": "0x52CE071Bd9b1C4B00A0b92D298c512478CaD67e8"
            }
        ],
        "exchanges": [
            {
                "name": "pancakeswap",
                "factory": {
                    "abi": "iuniswapv2-factory-abi",
                    "address": "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73"
                },
                "usdt": {
                    "name": "usdt",
                    "abi": "bep20",
                    "address": "0x55d398326f99059fF775485246999027B3197955"
                },
                "eth": {
                    "name": "eth",
                    "abi": "bep20",
                    "address": "0x2170ed0880ac9a755fd29b2688956bd959f933f8"
                }
            }
        ]
    }
]