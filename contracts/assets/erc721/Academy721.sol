// SPDX-License-Identifier: MIT

pragma solidity ^0.8.10;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

import "../../access/AccessControl.sol";

/** ERC721 item creation contract. */
contract Academy721 is ERC721URIStorage, AccessControl {
  /** Role identifier for bridging NFTs across layers. */
  bytes32 public constant BRIDGE_ROLE = keccak256("BRIDGE_ROLE");

  uint256 private immutable rangeUnit;

  /** Maximum number of tokens. */
  uint256 private immutable rangeMax;

  /** The number to start assign tokenIds from. */
  uint256 private immutable rangeMin;

  /** A counter for tracking token ids. */
  uint256 private tokenIds;

  /** Contracts chain id. */
  uint256 public chainId;

  // 42 (kovan) => kovan nft address
  // 97 (bscTestnet) => bsc nft address
  // mapping(uint256 => address) private addresses; // chainId => address

  // Range is a unit of 1000 NFTs… rangeId 0 means NFT #0 to NFT #999.
  // 42 => kovan
  // 97 => bscTestnet
  // mapping(uint256 => uint256) private rangeLoc; // rangeId => chainId


  mapping(uint256 => uint256) private nftLoc; // itemId => chainId

  /** @notice Creates a new ERC-721 item collection.
   * @param name Name of the collection.
   * @param symbol Symbol of the collection.
   */
  constructor(string memory name, string memory symbol, uint256 _rangeUnit) ERC721(name, symbol) {
    // uint256 id;
    // assembly {
    //   id := chainid()
    // }
    chainId = block.chainid;
    rangeUnit = _rangeUnit;
    rangeMin = chainId * rangeUnit;
    rangeMax = rangeMin + rangeUnit;
    tokenIds = rangeMin - 1;

    _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    _setupRole(BRIDGE_ROLE, msg.sender);
  }

  /**
   * @dev Safely mints `itemId` and transfers it to `to`.
   *
   * Requirements:
   * - If `to` refers to a smart contract, it must implement {IERC721Receiver-onERC721Received},
   * which is called upon a safe transfer.
   *
   * Emits a {Transfer} event.
   */
  function safeMint(
    address to,
    string memory tokenURI
  )
    external
    onlyRole(DEFAULT_ADMIN_ROLE)
  {
    tokenIds++;
    require(tokenIds <= rangeMax, "Reached token limit");
    uint256 id = tokenIds;

    _safeMint(to, id);
    _setTokenURI(id, tokenURI);

    nftLoc[id] = chainId;
  }
  
  function safeMintBridge(
    uint256 id,
    uint256 chainFrom,
    address to,
    string memory uri
  )
    external
    onlyRole(BRIDGE_ROLE)
  {
    require(nftLoc[id] == 0, "This id belongs to another chain");
    require(id >= rangeMin && id < rangeMax, "Incorrect id");

    _safeMint(to, id);
    _setTokenURI(id, uri);

    nftLoc[id] = chainFrom;
  }

  function exists(uint256 tokenId) external view returns(bool) {
    return _exists(tokenId);
  }
}