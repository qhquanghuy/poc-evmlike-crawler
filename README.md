# Proof of Concept

- First, start containers (geth, db). There is no retry feature so we must wait for a while to sync blockchain data then start the application

- Price on DEX only, still cannot figure out how to calculate price in order-book exchange from on-chain data.

## About the Data

1. Price calculation:

    - Price tokenA in terms of tokenB: `tokenA/tokenB = (reserveB / reserveB) * 10^(decimalA - decimalB)`

    - Price tokenA in USD: `tokenA/USD = tokenA/ETH * ETH/USDT`

    - USDT/USD = 1

2. Data in token_price_data

    - Listen Swap event on DEX (uniswap-like protocol)

3. Data in instant_price_data

    - Listen Sync event on DEX (uniswap-like protocol, occurred when reserve of pair changed)

4. APY of AAVE protocol

    - <https://docs.aave.com/developers/guides/apy-and-apr#compute-data>

## Disclaimer

- Some fields are NULL (order-book exchange data, ICO, version of contract, etc) because that data might not retrieve from on-chain data.

## Environment

Docker version 20.10.8, build 3967b7d

## RUN

```sh
./statup.sh
```
