// SPDX-License-Identifier: MIT

pragma solidity ^0.8.10;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

import "./assets/erc20/AcademyToken.sol";
import "./assets/erc721/EssentialImages.sol";

/** @title Simple NFT marketplace. */
contract Marketplace is IERC721Receiver, Ownable, Pausable {
  using SafeERC20 for IERC20;

  uint256 public numListed;
  address public token;
  address public nft;

  event CreatedItem(address indexed creator, address indexed to, uint256 indexed itemID);
  event ListedItem(uint256 indexed itemID, address indexed owner, uint256 price);
  event CancelListing(uint256 indexed itemID, address indexed owner);
  event Purchase(uint256 indexed itemID, address indexed buyer, address indexed seller, uint256 price);

  struct Item {
    uint256 price;
    address owner;
    bool isListed;
  }

  mapping(uint256 => Item) public listedItems; // itemID => Item

  constructor(address _token, address _nft) {
    token = _token;
    nft = _nft;
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
    returns (uint256 itemID)
  {
    itemID = EssentialImages(nft).safeMint(to, tokenURI);
    emit CreatedItem(msg.sender, to, itemID); // ?
  }

  function listItem(uint256 itemID, uint256 price)
    external
    whenNotPaused
  {
    require(price > 0, "Price can't be zero");

    EssentialImages(nft).safeTransferFrom(msg.sender, address(this), itemID);

    listedItems[itemID] = Item({
      price: price,
      owner: msg.sender,
      isListed: true
    });

    emit ListedItem(itemID, msg.sender, price);
  }

  function buyItem(uint256 itemID)
    external
    whenNotPaused
  {
    Item memory item = listedItems[itemID];
    require(msg.sender != item.owner, "Can't buy from yourself");
    require(item.isListed, "Item not listed");

    // Transfer tokens
    IERC20(token).safeTransferFrom(msg.sender, item.owner, item.price);

    // Transfer Item
    EssentialImages(nft).safeTransferFrom(address(this), msg.sender, itemID);
    listedItems[itemID].isListed = false;

    emit Purchase(itemID, msg.sender, item.owner, item.price);
  }

  function cancel(uint256 itemID)
    external
    whenNotPaused
  {
    Item storage item = listedItems[itemID];
    require(msg.sender == item.owner, "Not your item");

    EssentialImages(nft).safeTransferFrom(address(this), msg.sender, itemID);
    item.isListed = false;

    emit CancelListing(itemID, msg.sender);
  }

  function getAllItems() external view returns(Item[] memory) {
    uint256 numItems = EssentialImages(nft).tokenIds();
    Item[] memory listed = new Item[](numItems);
    for (uint256 i = 1; i <= numItems; i++) {
      // Here we assign to `i-1` because listedItems indexes start with 1
      listed[i - 1] = listedItems[i];
    }
    return listed;
  }
}
