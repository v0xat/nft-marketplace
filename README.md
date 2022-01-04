# NFT Marketplace

### Contracts on Rinkeby testnet:

Essential Images: [0x96a75426C5e109926FAB465536a50691f36f1c4c](https://rinkeby.etherscan.io/token/0x96a75426C5e109926FAB465536a50691f36f1c4c)

Marketplace: [0x6ccFD289E1C64Ed594fFa651107dC6EA06680A57](https://rinkeby.etherscan.io/address/0x6ccFD289E1C64Ed594fFa651107dC6EA06680A57)

Token: [0xE742FD01AcDbc54D92Ac58BB962EF606deBe7d3a](https://rinkeby.etherscan.io/token/0xE742FD01AcDbc54D92Ac58BB962EF606deBe7d3a)

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