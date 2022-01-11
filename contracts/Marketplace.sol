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

  // Auction duration timestamp
  uint256 public biddingTime;

  Counters.Counter private _numOrders; 

  // Address of the token contract used to pay for items
  AcademyToken public acdmToken;

  // Address of the NFT contract
  EssentialImages public acdmItems;

  event PlacedOrder(uint256 indexed orderId, uint256 indexed itemID, address indexed owner, uint256 basePrice);
  event CancelledOrder(uint256 indexed itemID, address indexed owner);
  event PlacedBid(uint256 indexed orderId, address indexed bidder, uint256 bidAmount);
  event AuctionEnded(uint256 indexed itemID, address indexed buyer, address indexed seller, uint256 price);
  event Purchase(uint256 indexed orderId, uint256 indexed itemID, address maker, address taker, uint256 price);

  enum OrderType {
    FixedPrice,
    Auction
  }

  struct Order {
    uint256 itemId;
    uint256 basePrice;
    uint256 listedAt;
    uint256 expiresAt;
    uint256 numBids;
    uint256 highestBid;
    uint256 bidStep;
    address maker;
    OrderType orderType;
  }

  // struct Bids {
  //   uint256 numBids;
  //   uint256 highestBid;
  //   uint256 bidStep;
  // }

  mapping(uint256 => Order) public orders; // orderId => Order

  // mapping(uint256 => Bids) public bids; // orderId => Bids

  constructor(
    uint256 _biddingTime,
    address _token,
    address _itemCreator,
    string memory _nftName,
    string memory _nftSymbol
  ) {
    biddingTime = _biddingTime;

    acdmToken = AcademyToken(_token);
    acdmItems = new EssentialImages(_nftName, _nftSymbol);

    // Grant the contract deployer the default admin role: 
    // it will be able to grant and revoke any roles
    _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    // Grant the NFT creator role to a specified account
    _setupRole(CREATOR_ROLE, _itemCreator);
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

  function changeBiddingTime(uint256 _biddingTime)
    external
    onlyRole(DEFAULT_ADMIN_ROLE)
    whenNotPaused
  {
    biddingTime = _biddingTime;
  }

  function listFixedPrice(uint256 itemId, uint256 basePrice)
    external
    whenNotPaused
  {
    require(basePrice > 0, "Base price can't be zero");

    _numOrders.increment();

    orders[_numOrders.current()] = Order({
      itemId: itemId,
      basePrice: basePrice,
      listedAt: block.timestamp,
      expiresAt: 0,
      numBids: 0,
      highestBid: 0,
      bidStep: 0,
      maker: msg.sender,
      orderType: OrderType.FixedPrice
    });

    acdmItems.safeTransferFrom(msg.sender, address(this), itemId);

    emit PlacedOrder(_numOrders.current(), itemId, msg.sender, basePrice);
  }

  function listAuction(uint256 itemId, uint256 basePrice, uint256 bidStep)
    external
    whenNotPaused
  {
    require(basePrice > 0, "Start price can't be zero");
    require(bidStep > 0, "Bid step can't be zero");

    _numOrders.increment();

    orders[_numOrders.current()] = Order({
      itemId: itemId,
      basePrice: basePrice,
      listedAt: block.timestamp,
      expiresAt: block.timestamp + biddingTime,
      numBids: 0,
      highestBid: 0,
      bidStep: 0,
      maker: msg.sender,
      orderType: OrderType.Auction
    });

    acdmItems.safeTransferFrom(msg.sender, address(this), itemId);

    emit PlacedOrder(_numOrders.current(), itemId, msg.sender, basePrice);
  }

  function buyOrder(uint256 orderId)
    external
    whenNotPaused
  {
    Order memory order = orders[orderId];
    require(msg.sender != order.maker, "Can't buy from yourself");
    require(order.basePrice > 0, "Item not listed");

    // Transfer ACDM tokens
    IERC20(acdmToken).safeTransferFrom(msg.sender, order.maker, order.basePrice);

    // Transfer Item
    acdmItems.safeTransferFrom(address(this), msg.sender, order.itemId);
    orders[orderId].basePrice = 0;

    emit Purchase(orderId, order.itemId, order.maker, msg.sender, order.basePrice);
  }

  function makeBid(uint256 orderId, uint256 bidAmount)
    external
  {
    Order memory order = orders[orderId];
    require(msg.sender != order.maker, "Can't buy from yourself");
    require(order.basePrice > 0, "Item not listed");

    // Transfer ACDM tokens
    IERC20(acdmToken).safeTransferFrom(msg.sender, address(this), bidAmount);

    emit PlacedBid(orderId, msg.sender, bidAmount);
  }

  function cancelOrder(uint256 orderId)
    external
    whenNotPaused
  {
    Order memory order = orders[orderId];
    require(msg.sender == order.maker, "Not the creator of the order");
    require(order.orderType == OrderType.FixedPrice, "Can't cancel an auction order");

    _cancelOrder(orderId, OrderType.FixedPrice);
  }

  function finishAuction(uint256 orderId) external {
    Order memory order = orders[orderId];
    require(order.orderType == OrderType.FixedPrice, "Not an auction order");
  }

  function _cancelOrder(uint256 orderId, OrderType orderType) private {
    Order storage order = orders[orderId];
    order.expiresAt = block.timestamp;

    acdmItems.safeTransferFrom(address(this), msg.sender, order.itemId);

    emit CancelledOrder(orderId, msg.sender);
  }

  // function isListed(uint256 itemId) external view returns(bool) {
  //   return listedItems[itemId].price > 0;
  // }

  // function getListedItems() external view returns(FixedPriceItem[] memory) {
  //   uint256 numListed = _numListed.current();
  //   Item[] memory listed = new Item[](numListed);

  //   uint256 counter;    
  //   for (uint256 i = 1; i <= numListed; i++) {
  //     if (listedItems[i].price > 0) {
  //       listed[counter] = listedItems[i];
  //       counter++;
  //     }
  //   }
  //   return listed;
  // }

  /**
    Always returns `IERC721Receiver.onERC721Received.selector`.
  */
  function onERC721Received(address, address, uint256, bytes memory) public virtual override returns (bytes4) {
    return this.onERC721Received.selector;
  }
}
