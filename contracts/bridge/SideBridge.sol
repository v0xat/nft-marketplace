// SPDX-License-Identifier: MIT

pragma solidity ^0.8.10;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/draft-EIP712.sol";

import "../assets/erc721/Academy721.sol";

/** @title Swaps ERC721 items between ETH <=> BSC networks. 
 * @dev This contract should be deployed on the Ethereum network.
 */
contract SideBridge is EIP712 {
  /** Backend signer address for swap. */
  address private gateway;

  /** NFT address in Ethereum. */
  address private eth;

  /** NFT address in BinanceSmartChain. */
  address private bsc;

  enum SwapStatus {
    Unknown,
    Initialized,
    Redeemed
  }

  struct SwapRequest {
    uint256 itemId;
    uint256 _chainFrom;
    uint256 _chainTo;
    string tokenURI;
    address itemContract;
    address swapper;
    address to;
    SwapStatus status;
  }

  event SwapInitialized(
    bytes32 indexed swapHash,
    address item,
    uint256 indexed itemId,
    address swapper,
    uint256 _chainFrom,
    uint256 _chainTo,
    address to
  );

  event SwapRedeemed(bytes32 indexed hash);

  mapping(bytes32 => SwapRequest) public requests;
  mapping(bytes32 => bool) public redeemed;

  constructor(string memory name, string memory version, address _eth, address _bsc, address _gateway) EIP712(name, version) {
    eth = _eth;
    bsc = _bsc;
    gateway = _gateway;
  }

  function swap(uint256 _itemId, address _to, uint256 _chainFrom, uint256 _chainTo)
    external
  {
    SwapRequest memory request = SwapRequest({
      itemId: _itemId,
      itemContract: bsc,
      _chainFrom: _chainFrom,
      _chainTo: _chainTo,
      tokenURI: Academy721(bsc).tokenURI(_itemId),
      swapper: msg.sender,
      to: _to,
      status: SwapStatus.Initialized
    });

    bytes32 hash = _hashToSign(request);
    requests[hash] = request;

    Academy721(bsc).safeTransferFrom(msg.sender, address(this), _itemId);

    emit SwapInitialized(hash, bsc, _itemId, msg.sender, _chainFrom, _chainTo, _to);
  }

  function redeem(bytes32 hash, uint8 v, bytes32 r, bytes32 s) external {
    require(msg.sender == gateway, "Only gateway can execute redeem");
    address signer = ECDSA.recover(hash, v, r, s);
    require(signer == gateway, "ECDSA: invalid signature");

    redeemed[hash] = true;
    Academy721(bsc).safeMint(address(this), "uri");

    emit SwapRedeemed(hash);
  }

  function _hashToSign(SwapRequest memory req)
    private
    view
    returns (bytes32)
  {
    return ECDSA.toTypedDataHash(_domainSeparatorV4(), _hash(req));
  }
  
  function _hash(SwapRequest memory req)
    internal
    pure
    returns (bytes32) {
    return keccak256(
      abi.encode(
        req.itemId,
        req.itemContract,
        req._chainFrom,
        req._chainTo,
        req.swapper,
        req.to,
        req.status
      )
    );
  }
}