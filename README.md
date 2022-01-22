# NFT Marketplace

### Description:

This marketplace allows to mint and sell ERC721 and ERC1155 items for ERC20 tokens.

There are two different ways of selling an item: sell at a fixed price or start an auction.
The auction works according to the following rules:
- Marketplace has a global bidding time, which can be set at deployment and later changed by the admin.
- To start an auction, user must specify a base price and a bid step (both in marketplace ERC20 tokens).
- Other users can place bids, the bid must be higher than the last bid.
- Auction can't be cancelled before the end of the bidding time.
- When the bidding time is over, the owner of the item may end the auction. If more than 2 bids have been placed, the item goes to the highest bidder and the auction owner receives tokens, otherwise the tokens are returned to the last bidder and the owner receives item back.

### Verified contracts in Kovan testnet:

Marketplace: [0x6ccFD289E1C64Ed594fFa651107dC6EA06680A57](https://kovan.etherscan.io/address/0x443Bbaf1E93EF13e772F407e5563c35751dd17a3)

Marketplace Token: [0x96a75426C5e109926FAB465536a50691f36f1c4c](https://kovan.etherscan.io/token/0x96a75426C5e109926FAB465536a50691f36f1c4c)

Academy 721: [0xF3eA487d82FD3F2Ec3E2836334b95a12616d06Ed](https://kovan.etherscan.io/token/0xF3eA487d82FD3F2Ec3E2836334b95a12616d06Ed)

Academy 1155: [0x0Fa4c2Ab77D3456B252716e3Aadf804fF9a5Db4A](https://kovan.etherscan.io/token/0x0Fa4c2Ab77D3456B252716e3Aadf804fF9a5Db4A)


### How to run

Create a `.env` file using the `.env.example` template with the following content
- [ALCHEMY_API_KEY](https://www.alchemy.com/)
- [CMC_API_KEY](https://coinmarketcap.com/api/)
- [ETHERSCAN_API_KEY](https://etherscan.io/apis)
- [MNEMONIC](https://docs.metamask.io/guide/common-terms.html#mnemonic-phrase-seed-phrase-seed-words)

Try running some of the following tasks and don't forget to specify network (ex. `--network kovan`):

* `hh` is a [shorthand](https://hardhat.org/guides/shorthand.html) for `npx hardhat`

```shell
hh coverage
hh test test/token.test.ts
hh accounts
hh run scripts/deploy.ts
hh token-balance --account <addrs>
```