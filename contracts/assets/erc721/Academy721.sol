// SPDX-License-Identifier: MIT

pragma solidity ^0.8.10;

import "../../access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/** ERC721 item creation contract. */
contract Academy721 is ERC721URIStorage, AccessControl {
  using Counters for Counters.Counter;

  /** Role identifier for the NFT creator role. */
  bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

  /** A counter for tracking token ids. */
  Counters.Counter private tokenIds;

  /** @notice Creates a new ERC-721 item collection.
   * @param name Name of the collection.
   * @param symbol Symbol of the collection.
   */
  constructor(string memory name, string memory symbol) ERC721(name, symbol) {
    _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
  }

  /**
   * @dev Safely mints `tokenId` and transfers it to `to`.
   *
   * Requirements:
   *
   * - `tokenId` must not exist.
   * - If `to` refers to a smart contract, it must implement {IERC721Receiver-onERC721Received}, which is called upon a safe transfer.
   *
   * Emits a {Transfer} event.
   */
  function safeMint(address to, string memory tokenURI)
    external
    onlyRole(DEFAULT_ADMIN_ROLE)
    returns (uint256)
  {
    tokenIds.increment();

    uint256 newItemId = tokenIds.current();
    _safeMint(to, newItemId);
    _setTokenURI(newItemId, tokenURI);

    return newItemId;
  }

  function burn(uint256 tokenId)
    external
    onlyRole(BURNER_ROLE)
  {
    _burn(tokenId);
  }
}