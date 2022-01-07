// SPDX-License-Identifier: MIT

pragma solidity ^0.8.10;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

import "./assets/erc20/AcademyToken.sol";
import "./assets/erc721/EssentialImages.sol";

/** @title Simple NFT marketplace. */
contract Marketplace is IERC721Receiver, Ownable, Pausable {
  using SafeERC20 for IERC20;
  using Counters for Counters.Counter;

  Counters.Counter private _numListed; 

  address public token;
  EssentialImages public nft;

  event ListedItem(uint256 indexed itemID, address indexed owner, uint256 price);
  event CancelListing(uint256 indexed itemID, address indexed owner);
  event Purchase(uint256 indexed itemID, address indexed buyer, address indexed seller, uint256 price);

  struct Item {
    uint256 price;
    address owner;
  }

  mapping(uint256 => Item) public listedItems; // itemID => Item

  constructor(address _token, string memory nftName, string memory nftSymbol) {
    token = _token;
    nft = new EssentialImages(nftName, nftSymbol);
  }

  /**
    Always returns `IERC721Receiver.onERC721Received.selector`.
  */
  function onERC721Received(address, address, uint256, bytes memory) public virtual override returns (bytes4) {
    return this.onERC721Received.selector;
  }

  /** @notice Pausing some functions of contract.
    @dev Available only to admin.
    Prevents calls to functions with `whenNotPaused` modifier.
  */
  function pause() external onlyOwner {
    _pause();
  }

  /** @notice Unpausing functions of contract.
    @dev Available only to admin.
  */
  function unpause() external onlyOwner {
    _unpause();
  }

  function createItem(address to, string memory tokenURI)
    external
    onlyOwner
    whenNotPaused
    returns (uint256 itemId)
  {
    itemId = nft.safeMint(to, tokenURI);
  }

  function listItem(uint256 itemId, uint256 price)
    external
    whenNotPaused
  {
    require(price > 0, "Price can't be zero");

    nft.safeTransferFrom(msg.sender, address(this), itemId);

    listedItems[itemId] = Item({
      price: price,
      owner: msg.sender
    });

    _numListed.increment();

    emit ListedItem(itemId, msg.sender, price);
  }

  function buyItem(uint256 itemId)
    external
    whenNotPaused
  {
    Item memory item = listedItems[itemId];
    require(msg.sender != item.owner, "Can't buy from yourself");
    require(item.price > 0, "Item not listed");

    // Transfer tokens
    IERC20(token).safeTransferFrom(msg.sender, item.owner, item.price);

    // Transfer Item
    nft.safeTransferFrom(address(this), msg.sender, itemId);
    listedItems[itemId].price = 0;

    _numListed.decrement();

    emit Purchase(itemId, msg.sender, item.owner, item.price);
  }

  function cancel(uint256 itemId)
    external
    whenNotPaused
  {
    Item storage item = listedItems[itemId];
    require(msg.sender == item.owner, "Not your item");

    nft.safeTransferFrom(address(this), msg.sender, itemId);
    item.price = 0;

    _numListed.decrement();

    emit CancelListing(itemId, msg.sender);
  }

  function isListed(uint256 itemId) external view returns(bool) {
    return listedItems[itemId].price > 0;
  }

  function getListedItems() external view returns(Item[] memory) {
    uint256 numListed = _numListed.current();
    Item[] memory listed = new Item[](numListed);

    uint256 counter;    
    for (uint256 i = 1; i <= numListed; i++) {
      if (listedItems[i].price > 0) {
        listed[counter] = listedItems[i];
        counter++;
      }
    }
    return listed;
  }
}
