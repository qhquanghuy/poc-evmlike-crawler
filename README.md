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

4. Data in dex_quickswap_eth-usdt_deposit_data

    - Listen Mint event on DEX

5. Data in dex_quickswap_eth-usdt_trading_info

    - Listen Swap event on DEX. market_price_traded_in = value_traded_out / value_traded_in

6. APY of AAVE protocol

    - <https://docs.aave.com/developers/guides/apy-and-apr#compute-data>
 
7. Datetime record: block timestamp of tx

## Disclaimer

- Some fields are NULL (order-book exchange data, ICO, version of contract, etc) because that data might not retrieve from on-chain data.

## Environment

Docker version 20.10.8, build 3967b7d

## RUN

```sh
./statup.sh
```
