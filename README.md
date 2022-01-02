# NFT Marketplace


### How to run

Create a `.env` file using the `.env.example` template with the following content
- [ALCHEMY_API_KEY](https://www.alchemy.com/)
- [CMC_API_KEY](https://coinmarketcap.com/api/)
- [ETHERSCAN_API_KEY](https://etherscan.io/apis)
- [POLYGONSCAN_API_KEY](https://polygonscan.com/apis) - optional, etherscan is used in config
- MNEMONIC

`.env-<network_name>` with:
- TOKEN_NAME
- TOKEN_SYMBOL
- TOKEN_DECIMALS

Try running some of the following tasks and don't forget to specify network (ex. `--network rinkeby`):

```shell
npx hardhat coverage
npx hardhat test test/token.test.ts
npx hardhat accounts
npx hardhat run scripts/deploy.ts
npx hardhat token-balance --account <addrs>
```