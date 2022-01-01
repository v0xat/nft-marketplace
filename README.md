# Solidity project template

This project demonstrates an advanced Hardhat use case, integrating other tools commonly used alongside Hardhat in the ecosystem.

The project comes with a custom ERC-20 token implementation with mint/burn, fees, whitelist and OpenZeppelin AccessControl. There are also tests, deploy script and CI config.

### How to run

Create a `.env` file using the `.env.example` template with the following content
- [ALCHEMY_API_KEY](https://www.alchemy.com/)
- [POLYGONSCAN_API_KEY](https://polygonscan.com/apis)
- [CMC_API_KEY](https://coinmarketcap.com/api/)
- [ETHERSCAN_API_KEY](https://etherscan.io/apis) - optional, polygonscan is used in config
- MNEMONIC

`.env-<network_name>` with:
- TOKEN_NAME
- TOKEN_SYMBOL
- TOKEN_DECIMALS
- TOKEN_MINT

Try running some of the following tasks and don't forget to specify network (ex. `--network mumbai`):

```shell
npx hardhat coverage
npx hardhat test test/token.test.ts
GAS=true npx hardhat test test/token.test.ts
npx hardhat accounts
npx hardhat run scripts/deploy.ts --network mumbai
npx hardhat token-balance --account <addrs> --network mumbai
```