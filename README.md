# NFT Marketplace

### Contracts on Rinkeby testnet:

Essential Images: [0x7a69da73dfED20B6666d99ffa4dC5E039551F6a7](https://rinkeby.etherscan.io/token/0x7a69da73dfED20B6666d99ffa4dC5E039551F6a7)

Marketplace: [0x6ccFD289E1C64Ed594fFa651107dC6EA06680A57](https://rinkeby.etherscan.io/address/0xfc97a67AD6910904BF07D898D603b049E78d6457)

Token: [0x1F06A276d26028d7E1D392B7E432E255f9137d9B](https://rinkeby.etherscan.io/token/0x1F06A276d26028d7E1D392B7E432E255f9137d9B)

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