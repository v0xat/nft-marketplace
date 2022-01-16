// SPDX-License-Identifier: MIT

pragma solidity ^0.8.10;

import "@openzeppelin/contracts/utils/introspection/IERC165.sol";

/** @title An interface for EssentialImages(721) and AcdmItems(1155) used in Marketplace  */
interface IAssets is IERC165 {
  function safeTransferFrom(
    address from,
    address to,
    uint256 tokenId
   ) external;

  function safeTransferFrom(
    address from,
    address to,
    uint256 id,
    uint256 amount,
    bytes memory data
   ) external;

   function safeBatchTransferFrom(
    address from,
    address to,
    uint256[] memory ids,
    uint256[] memory amounts,
    bytes memory data
  ) external;
  
  function safeMint(
    address to,
    string memory tokenURI
  ) external returns (uint256);

  function mintBatch(
    address to,
    uint256[] memory ids,
    uint256[] memory amounts,
    bytes memory data
  ) external;
}