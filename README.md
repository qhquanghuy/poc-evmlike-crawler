# Proof of Concept

- Realtime data from chains: bsc, ethereum mainnet and polygon

- Price on DEX only, still cannot figure out how to calculate price in order-book exchange from on-chain data.

## About the Data

1. Price calculation:

    - Price tokenA in terms of tokenB: `tokenA/tokenB = (reserveB / reserveA) * 10^(decimalA - decimalB)`

    - Price tokenA in USD: `tokenA/USD = tokenA/ETH * ETH/USDT`

    - USDT/USD = 1

2. Data in token_price_data

    - Listen Swap event on DEX (uniswap-like protocol)

3. Data in instant_price_data

    - Listen Sync event on DEX (uniswap-like protocol, occurred when reserve of pair changed)

4. APY of AAVE protocol

    - <https://docs.aave.com/developers/guides/apy-and-apr#compute-data>
 
5. Datetime record: block timestamp of tx

## Disclaimer

- Some fields are NULL (order-book exchange data, ICO, version of contract, etc) because that data might not retrieve from on-chain data.

## Environment

Docker version 20.10.8, build 3967b7d

## RUN

```sh
./statup.sh
```
