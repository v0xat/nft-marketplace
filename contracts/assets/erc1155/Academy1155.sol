// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/** ERC1155 items creation contract. */
contract Academy1155 is ERC1155, Ownable {
  constructor(string memory uri) ERC1155(uri) {}

  function setURI(string memory newuri) public onlyOwner {
    _setURI(newuri);
  }

  /**
   * @dev See {ERC1155 - _mintBatch}.
   */
  function mintBatch(address to, uint256[] memory ids, uint256[] memory amounts, bytes memory data)
    external
    onlyOwner
  {
    _mintBatch(to, ids, amounts, data);
  }
}