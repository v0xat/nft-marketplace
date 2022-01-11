// SPDX-License-Identifier: MIT

pragma solidity ^0.8.10;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

import "./assets/erc20/AcademyToken.sol";
import "./assets/erc721/EssentialImages.sol";

/** @title Simple NFT marketplace. */
contract Marketplace is IERC721Receiver, AccessControl, Pausable {
  using SafeERC20 for IERC20;
  using Counters for Counters.Counter;

  // Create a new role identifier for the NFT creator role
  bytes32 public constant CREATOR_ROLE = keccak256("CREATOR_ROLE");

  // Counts the amount of items that are currently listed on the marketplace
  Counters.Counter private _numListed; 

  // Address of the token contract used to pay for items
  AcademyToken public acdmToken;

  // Address of the NFT contract
  EssentialImages public acdmItems;

  event ListedItem(uint256 indexed itemID, address indexed owner, uint256 price);
  event CancelListing(uint256 indexed itemID, address indexed owner);
  event Purchase(uint256 indexed itemID, address indexed buyer, address indexed seller, uint256 price);

  struct Item {
    uint256 price;
    address owner;
  }

  // Used to store listed items price & owner address
  mapping(uint256 => Item) public listedItems; // itemID => Item

  constructor(address _token, address _creator, string memory _nftName, string memory _nftSymbol) {
    acdmToken = AcademyToken(_token);
    acdmItems = new EssentialImages(_nftName, _nftSymbol);

    // Grant the contract deployer the default admin role: it will be able
    // to grant and revoke any roles
    _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    // Grant the NFT creator role to a specified account
    _setupRole(CREATOR_ROLE, _creator);
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
  function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
    _pause();
  }

  /** @notice Unpausing functions of contract.
    @dev Available only to admin.
  */
  function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
    _unpause();
  }

  function createItem(address to, string memory tokenURI)
    external
    onlyRole(CREATOR_ROLE)
    whenNotPaused
    returns (uint256 itemId)
  {
    itemId = acdmItems.safeMint(to, tokenURI);
  }

  function listItem(uint256 itemId, uint256 price)
    external
    whenNotPaused
  {
    require(price > 0, "Price can't be zero");

    acdmItems.safeTransferFrom(msg.sender, address(this), itemId);

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

    // Transfer ACDM tokens
    IERC20(acdmToken).safeTransferFrom(msg.sender, item.owner, item.price);

    // Transfer Item
    acdmItems.safeTransferFrom(address(this), msg.sender, itemId);
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

    acdmItems.safeTransferFrom(address(this), msg.sender, itemId);
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
