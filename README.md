# NFT Marketplace

Still in develop, TODO:
- bridge eth-bsc ?
- deploy

### Description:

This marketplace allows to mint and sell ERC721 and ERC1155 items for ERC20 tokens.

There are two different ways of selling an item: sell at a fixed price or start an auction.
The auction works according to the following rules:
- Marketplace has a global bidding time, which can be set at deployment and later changed by the admin.
- To start an auction, user must specify a base price and a bid step (both in marketplace ERC20 tokens).
- Other users can place bids, the bid must be higher than the last bid.
- Auction can't be cancelled before the end of the bidding time.
- When the bidding time is over, the owner of the item may end the auction. If more than 2 bids have been placed, the item goes to the highest bidder and the auction owner receives tokens, otherwise the tokens are returned to the last bidder and the owner receives item back.

### Contracts on Rinkeby testnet:


<!-- Essential Images: [0x7a69da73dfED20B6666d99ffa4dC5E039551F6a7](https://rinkeby.etherscan.io/token/0xbFfb4Ed8df31a6A788e1B67E92B732087F998a2c)

Marketplace: [0x6ccFD289E1C64Ed594fFa651107dC6EA06680A57](https://rinkeby.etherscan.io/address/0x443Bbaf1E93EF13e772F407e5563c35751dd17a3)

Token: [0x1F06A276d26028d7E1D392B7E432E255f9137d9B](https://rinkeby.etherscan.io/token/0xf7fA25BbD63d7A6F3Cc4f0898bAf55d1f5591796) -->

### How to run

Create a `.env` file using the `.env.example` template with the following content
- [ALCHEMY_API_KEY](https://www.alchemy.com/)
- [POLYGONSCAN_API_KEY](https://polygonscan.com/apis)
- [CMC_API_KEY](https://coinmarketcap.com/api/)
- [BSCSCAN_API_KEY](https://bscscan.com/apis)
- [ETHERSCAN_API_KEY](https://etherscan.io/apis)
- [MNEMONIC](https://docs.metamask.io/guide/common-terms.html#mnemonic-phrase-seed-phrase-seed-words)

Try running some of the following tasks and don't forget to specify network (ex. `--network rinkeby`):

* `hh` is a [shorthand](https://hardhat.org/guides/shorthand.html) for `npx hardhat`

```shell
hh coverage
hh test test/token.test.ts
hh accounts
hh run scripts/deploy.ts
hh token-balance --account <addrs>
```