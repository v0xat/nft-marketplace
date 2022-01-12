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

  event PlacedOrder(uint256 indexed orderId, uint256 indexed itemId, address indexed owner, uint256 basePrice);
  event CancelledOrder(uint256 indexed orderId, bool isSold);
  event PlacedBid(uint256 indexed orderId, address indexed maker, uint256 bidAmount);
  event AuctionFinished(uint256 indexed orderId, uint256 numBids);
  event Purchase(uint256 indexed orderId, uint256 indexed itemId, address maker, address taker, uint256 price);

  modifier notZero(uint256 num) {
    require(num > 0, "Price & bid step can't be zero");
    _;
  }

  enum OrderType {
    FixedPrice,
    Auction
  }

  struct Order {
    uint256 itemId;
    uint256 basePrice;
    uint256 expiresAt;
    uint256 endTime;
    uint256 numBids;
    uint256 highestBid;
    uint256 bidStep;
    address maker;
    address highestBidder;
    OrderType orderType;
  }

  mapping(uint256 => Order) public orders; // orderId => Order

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
    notZero(basePrice)
  {
    // require(basePrice > 0, "Base price can't be zero");

    _numOrders.increment();

    orders[_numOrders.current()] = Order({
      itemId: itemId,
      basePrice: basePrice,
      expiresAt: 0,
      endTime: 0,
      numBids: 0,
      highestBid: 0,
      bidStep: 0,
      maker: msg.sender,
      highestBidder: msg.sender,
      orderType: OrderType.FixedPrice
    });

    acdmItems.safeTransferFrom(msg.sender, address(this), itemId);

    emit PlacedOrder(_numOrders.current(), itemId, msg.sender, basePrice);
  }

  function listAuction(uint256 itemId, uint256 basePrice, uint256 bidStep)
    external
    whenNotPaused
    notZero(basePrice)
    notZero(bidStep)
  {
    // require(basePrice > 0, "Base price can't be zero");
    // require(bidStep > 0, "Bid step can't be zero");

    _numOrders.increment();

    orders[_numOrders.current()] = Order({
      itemId: itemId,
      basePrice: basePrice,
      expiresAt: block.timestamp + biddingTime,
      endTime: 0,
      numBids: 0,
      highestBid: basePrice,
      bidStep: bidStep,
      maker: msg.sender,
      highestBidder: msg.sender,
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
    require(order.basePrice > 0 && order.endTime == 0, "Order cancelled or not exist");
    require(order.orderType == OrderType.FixedPrice, "Can't buy auction order");
    require(msg.sender != order.maker, "Can't buy from yourself");

    // Transfer NFT to `msg.sender` and ACDM to order owner
    _exchange(orderId, order.itemId, order.basePrice, msg.sender, order.maker, msg.sender);

    // Closing order
    _cancelOrder(orderId, true);
  }

  function makeBid(uint256 orderId, uint256 bidAmount)
    external
  {
    Order storage order = orders[orderId];
    require(bidAmount > (order.highestBid + order.bidStep), "Bid must be more than highest + bid step");
    require(order.expiresAt > block.timestamp, "Bidding time is over");
    require(msg.sender != order.maker, "Can't bid on your own order");

    // Transfer ACDM tokens
    IERC20(acdmToken).safeTransferFrom(msg.sender, address(this), bidAmount);

    // Return ACDM to prev bidder
    if (order.numBids > 0) {
      IERC20(acdmToken).safeTransfer(order.highestBidder, order.highestBid);
    }

    order.numBids++;
    order.highestBid = bidAmount;
    order.highestBidder = msg.sender;

    emit PlacedBid(orderId, msg.sender, bidAmount);
  }

  function cancelOrder(uint256 orderId)
    external
    whenNotPaused
  {
    Order memory order = orders[orderId];
    require(msg.sender == order.maker, "Not the order creator");
    require(order.orderType == OrderType.FixedPrice, "Can't cancel an auction order");

    _cancelOrder(orderId, false);
  }

  function finishAuction(uint256 orderId) external {
    Order memory order = orders[orderId];
    require(order.endTime == 0, "No such order");
    require(msg.sender == order.maker, "Not the order creator");
    require(order.orderType == OrderType.Auction, "Not an auction order");
    require(order.expiresAt <= block.timestamp, "Can't finish before bidding time");

    if (order.numBids > 2) {
      _exchange(orderId, order.itemId, order.highestBid, address(0), order.maker, order.highestBidder);
      _cancelOrder(orderId, true);
    } else {
      // Return ACDM to latest bidder if exists
      if (order.numBids == 1) IERC20(acdmToken).safeTransfer(order.highestBidder, order.highestBid);
      _cancelOrder(orderId, false);
    }

    emit AuctionFinished(orderId, order.numBids);
  }

  function _exchange(
    uint256 orderId,
    uint256 itemId,
    uint256 price,
    address payer,
    address itemOwner,
    address itemRecipient
  ) private {
    if (payer != address(0)) IERC20(acdmToken).safeTransferFrom(payer, itemOwner, price);
    else IERC20(acdmToken).safeTransfer(itemOwner, price);

    acdmItems.safeTransferFrom(address(this), itemRecipient, itemId);

    emit Purchase(orderId, itemId, itemOwner, itemRecipient, price);
  }

  function _cancelOrder(uint256 orderId, bool isSold) private {
    Order storage order = orders[orderId];
    order.endTime = block.timestamp;

    // Return item if it's not sold
    if (!isSold) {
      acdmItems.safeTransferFrom(address(this), order.maker, order.itemId);
    }

    emit CancelledOrder(orderId, isSold);
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
