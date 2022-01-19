// SPDX-License-Identifier: MIT

pragma solidity ^0.8.10;

import "hardhat/console.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/draft-EIP712.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

import "../assets/erc721/Academy721.sol";

/** @title Swaps ERC721 items between ETH <=> BSC networks. 
 * @dev This contract should be deployed on the Ethereum network.
 */
contract SideBridge is EIP712, IERC721Receiver {
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

  /* An ECDSA signature. */ 
  struct Sig {
    /* v parameter */
    uint8 v;
    /* r parameter */
    bytes32 r;
    /* s parameter */
    bytes32 s;
  }

  struct SwapRequest {
    uint256 itemId;
    uint256 chainFrom;
    uint256 chainTo;
    string tokenURI;
    address itemContract;
    address swapper;
    address to;
    SwapStatus status;
  }

  event SwapInitialized(
    bytes32 indexed swapHash,
    uint256 indexed itemId,
    string uri,
    address swapper,
    uint256 chainFrom,
    uint256 chainTo,
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

  function swap(uint256 id, address to, uint256 chainFrom, uint256 chainTo)
    external
  {
    require(Academy721(bsc).ownerOf(id) == msg.sender, "Caller is not owner nor approved");
    SwapRequest memory request = SwapRequest({
      itemId: id,
      itemContract: bsc,
      chainFrom: chainFrom,
      chainTo: chainTo,
      tokenURI: Academy721(bsc).tokenURI(id),
      swapper: msg.sender,
      to: to,
      status: SwapStatus.Initialized
    });

    bytes32 hash = _hashToSign(request);
    requests[hash] = request;

    Academy721(bsc).safeTransferFrom(msg.sender, address(this), id);

    emit SwapInitialized(hash, id, request.tokenURI, msg.sender, chainFrom, chainTo, to);
  }

  function redeem(bytes32 hash, Sig memory sig, address to, uint256 id, string calldata uri, uint256 chainFrom) external {
    require(msg.sender == gateway, "Only gateway can execute redeem");
    require(!redeemed[hash], "Can't redeem twice");

    address signer = ECDSA.recover(hash, sig.v, sig.r, sig.s);
    require(signer == gateway, "ECDSA: invalid signature");

    if (Academy721(bsc).exists(id)) {
      Academy721(bsc).safeTransferFrom(address(this), to, id);
    } else {
      Academy721(bsc).safeMintBridge(id, chainFrom, to, uri);
    }

    redeemed[hash] = true;

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
        req.chainFrom,
        req.chainTo,
        req.tokenURI,
        req.swapper,
        req.to,
        req.status
      )
    );
  }

  /** Always returns `IERC721Receiver.onERC721Received.selector`. */
  function onERC721Received(address, address, uint256, bytes memory) public virtual override returns (bytes4) {
    return this.onERC721Received.selector;
  }
}