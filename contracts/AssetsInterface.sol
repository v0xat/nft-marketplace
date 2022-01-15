// SPDX-License-Identifier: MIT

pragma solidity ^0.8.10;

import "@openzeppelin/contracts/utils/introspection/IERC165.sol";

/** @title An interface for EssentialImages(721) and AcdmItems(1155) used in Marketplace  */
interface IAssetsInterface is IERC165 {
  function safeMint(
    address to,
    string memory tokenURI
  ) external returns (uint256);

  function mint(
    address account,
    uint256 id,
    uint256 amount,
    bytes memory data
  ) external;

  function mintBatch(
    address to,
    uint256[] memory ids,
    uint256[] memory amounts,
    bytes memory data
  ) external;
}