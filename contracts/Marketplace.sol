// SPDX-License-Identifier: MIT

pragma solidity ^0.8.10;

// import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

import "./assets/erc20/AcademyToken.sol";
import "./assets/erc721/EssentialImages.sol";

/** @title NFT marketplace creation contract.
 * @author https://github.com/v0xat
 */
contract Marketplace is IERC721Receiver, AccessControl, Pausable {
  using SafeERC20 for IERC20;
  using Counters for Counters.Counter;

  /** Role identifier for the NFT creator role. */
  bytes32 public constant CREATOR_ROLE = keccak256("CREATOR_ROLE");

  /** Auction duration timestamp. */
  uint256 public biddingTime;

  /** Counts number of orders. */
  Counters.Counter private _numOrders;

  /** Address of the token contract used to pay for items. */
  AcademyToken public acdmToken;

  /** Address of the NFT contract. */
  EssentialImages public acdmItems;

  /** Emitted when a new order is placed. */
  event PlacedOrder(uint256 indexed orderId, uint256 indexed itemId, address indexed owner, uint256 basePrice);

  /** Emitted when an order is cancelled. */
  event CancelledOrder(uint256 indexed orderId, bool isSold);

  /** Emitted at the new highest bid. */
  event NewHighestBid(uint256 indexed orderId, address indexed maker, uint256 bidAmount);

  /** Emitted when the bidding time changes. */
  event BiddingTimeChanged(address from, uint256 newBiddingTime);

  /** Emitted when the auction is finished. */
  event AuctionFinished(uint256 indexed orderId, uint256 numBids);

  /** Emitted when a new purchase occures. */
  event Purchase(uint256 indexed orderId, uint256 indexed itemId, address maker, address taker, uint256 price);

  /**
   * @dev Checks if the given number is greater than zero.
   */
  modifier notZero(uint256 num) {
    require(num > 0, "Price & bid step can't be zero");
    _;
  }

  /** Order type: fixed price or auction. */
  enum OrderType {
    FixedPrice,
    Auction
  }

  /** Order struct. */
  struct Order {
    /** EssentialItems item id. */
    uint256 itemId;
    /** Base price in ACDM tokens. */
    uint256 basePrice;
    /** Expiration timestamp - 0 for fixed price. */
    uint256 expiresAt;
    /** Ending time - set at cancellation. */
    uint256 endTime;
    /** Number of bids. */
    uint256 numBids;
    /** Highest bid in ACDM tokens. */
    uint256 highestBid;
    /** Bid step in ACDM tokens. */
    uint256 bidStep;
    /** Maker address. */
    address maker;
    /** Address of the last bidder. */
    address highestBidder;
    /** Order type. */
    OrderType orderType;
  }

  /** Bid struct. */
  struct Bid {
    /** Bid amount in ACDM tokens. */
    uint256 amount;
    /** Bidder address. */
    address bidder;
  }

  /** Orders by id. */
  mapping(uint256 => Order) public orders; // orderId => Order

  /** Bids by order and bid id. */
  mapping(uint256 => mapping(uint256 => Bid)) public bids; // orderId => bidId => Bid

  /** @notice Creates marketplace contract.
   * @dev Grants `DEFAULT_ADMIN_ROLE` to `msg.sender`.
   * Grants `CREATOR_ROLE` to `_itemCreator`.
   * @param _biddingTime Initial bidding time.
   * @param _token The address of the token used for payments.
   * @param _itemCreator The address of the item creator.
   * @param _nftName Name of the EssentialImages contract.
   * @param _nftSymbol Symbol of the EssentialImages contract.
   */
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

    _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
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

  /** @notice Mints new ERC721 item.
   * @dev Calls `EssentialItems.safeMint` function.
   *  Available only to users with `CREATOR_ROLE`.
   *
   * @param to The address to mint to.
   * @param tokenURI URI of the new item.
   */
  function createItem(address to, string memory tokenURI)
    external
    onlyRole(CREATOR_ROLE)
    whenNotPaused
    returns (uint256 itemId)
  {
    itemId = acdmItems.safeMint(to, tokenURI);
  }

  /** @notice Mints new ERC721 item.
   * @dev Available only to admin.
   *
   * Emits a {BiddingTimeChanged} event.
   *
   * @param _biddingTime New bidding time (timestamp).
   */
  function changeBiddingTime(uint256 _biddingTime)
    external
    onlyRole(DEFAULT_ADMIN_ROLE)
    whenNotPaused
  {
    biddingTime = _biddingTime;
    emit BiddingTimeChanged(msg.sender, _biddingTime);
  }

  function listFixedPrice(uint256 itemId, uint256 basePrice)
    external
    whenNotPaused
    notZero(basePrice)
  {
    _numOrders.increment();
    uint256 numOrders = _numOrders.current();

    Order storage newOrder = orders[numOrders];
    newOrder.itemId = itemId;
    newOrder.basePrice = basePrice;
    newOrder.maker = msg.sender;
    newOrder.orderType = OrderType.FixedPrice;

    _transferItem(msg.sender, address(this), itemId);

    emit PlacedOrder(numOrders, itemId, msg.sender, basePrice);
  }

  function listAuction(uint256 itemId, uint256 basePrice, uint256 bidStep)
    external
    whenNotPaused
    notZero(basePrice)
    notZero(bidStep)
  {
    _numOrders.increment();
    uint256 numOrders = _numOrders.current();

    Order storage newOrder = orders[numOrders];
    newOrder.itemId = itemId;
    newOrder.basePrice = basePrice;
    newOrder.expiresAt = block.timestamp + biddingTime;
    newOrder.highestBid = basePrice;
    newOrder.bidStep = bidStep;
    newOrder.maker = msg.sender;
    newOrder.orderType = OrderType.Auction;

    _transferItem(msg.sender, address(this), itemId);

    emit PlacedOrder(numOrders, itemId, msg.sender, basePrice);
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

  function makeBid(uint256 orderId, uint256 bidAmount) external whenNotPaused {
    Order storage order = orders[orderId];
    require(bidAmount > (order.highestBid + order.bidStep), "Bid must be more than highest + bid step");
    require(order.expiresAt > block.timestamp, "Bidding time is over");
    require(msg.sender != order.maker, "Can't bid on your own order");

    // Transfer ACDM tokens
    _transferTokens(msg.sender, address(this), bidAmount);

    // Return ACDM to prev bidder
    if (order.numBids > 0) {
      _transferTokens(address(0), order.highestBidder, order.highestBid);
    }

    order.numBids++;
    order.highestBid = bidAmount;
    order.highestBidder = msg.sender;

    bids[orderId][order.numBids] = Bid({
      amount: bidAmount,
      bidder: msg.sender
    });

    emit NewHighestBid(orderId, msg.sender, bidAmount);
  }

  function cancelOrder(uint256 orderId) external whenNotPaused {
    Order memory order = orders[orderId];
    require(msg.sender == order.maker, "Not the order creator");
    require(order.orderType == OrderType.FixedPrice, "Can't cancel an auction order");

    _cancelOrder(orderId, false);
  }

  function finishAuction(uint256 orderId) external whenNotPaused {
    Order storage order = orders[orderId];
    require(order.endTime == 0, "No such order");
    require(msg.sender == order.maker, "Not the order creator");
    require(order.orderType == OrderType.Auction, "Not an auction order");
    require(order.expiresAt <= block.timestamp, "Can't finish before bidding time");

    if (order.numBids > 2) {
      _exchange(orderId, order.itemId, order.highestBid, address(0), order.maker, order.highestBidder);
      _cancelOrder(orderId, true);
    } else {
      // Return ACDM to latest bidder if exists
      if (order.numBids > 0) _transferTokens(address(0), order.highestBidder, order.highestBid);
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
    _transferTokens(payer, itemOwner, price);

    _transferItem(address(this), itemRecipient, itemId);

    emit Purchase(orderId, itemId, itemOwner, itemRecipient, price);
  }

  function _transferItem(address from, address to, uint256 itemId) private {
    acdmItems.safeTransferFrom(from, to, itemId);
  }

  function _transferTokens(address from, address to, uint256 amount) private {
    if (from != address(0)) IERC20(acdmToken).safeTransferFrom(from, to, amount);
    else IERC20(acdmToken).safeTransfer(to, amount);
  }

  function _cancelOrder(uint256 orderId, bool isSold) private {
    Order storage order = orders[orderId];
    order.endTime = block.timestamp;

    // Return item if it's not sold
    if (!isSold) _transferItem(address(this), order.maker, order.itemId);

    emit CancelledOrder(orderId, isSold);
  }

  function isListed(uint256 itemId) external view returns(bool) {
    uint256 numOrders = _numOrders.current();
    for (uint256 i = 1; i <= numOrders; i++) {
      if (orders[i].endTime == 0 && orders[i].itemId == itemId)
        return true;
    }
    return false;
  }

  function getOrdersHistory() external view returns(Order[] memory) {
    uint256 numOrders = _numOrders.current();
    Order[] memory ordersArr = new Order[](numOrders);
   
    for (uint256 i = 1; i <= numOrders; i++) {
      ordersArr[i - 1] = orders[i];
    }
    return ordersArr;
  }

  function getOpenOrders() external view returns(Order[] memory) {
    uint256 numOrders = _numOrders.current();
    Order[] memory openOrders = new Order[](numOrders);

    uint256 counter;
    for (uint256 i = 1; i <= numOrders; i++) {
      // console.log(orders[i].maker);
      // console.log(orders[i].endTime);
      if (orders[i].endTime == 0) {
        openOrders[counter] = orders[i];
        counter++;
      }
    }
    return openOrders;
  }

  function getBidsHistory() external view returns (Bid[][] memory) {
    uint256 numOrders = _numOrders.current();
    Bid[][] memory bidsHistory = new Bid[][](numOrders);

    for (uint256 i = 1; i <= numOrders; i++) {
      bidsHistory[i - 1] = getBidsByOrder(i);
    }

    return bidsHistory;
  }

  function getBidsByOrder(uint256 orderId) public view returns (Bid[] memory) {
    uint256 numBids = orders[orderId].numBids;
    Bid[] memory orderBids = new Bid[](numBids);

    uint256 counter;
    for (uint256 i = 1; i <= numBids; i++) {
      orderBids[i - 1] = bids[orderId][i];
      counter++;
    }

    return orderBids;
  }

  /** Always returns `IERC721Receiver.onERC721Received.selector`. */
  function onERC721Received(address, address, uint256, bytes memory) public virtual override returns (bytes4) {
    return this.onERC721Received.selector;
  }
}
