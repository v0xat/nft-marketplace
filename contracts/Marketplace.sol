// SPDX-License-Identifier: MIT

pragma solidity ^0.8.10;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

import "./assets/erc20/Token.sol";
import "./assets/erc721/NFT.sol";

/** @title Simple NFT marketplace. */
contract Marketplace is Ownable, ReentrancyGuard, Pausable {
    address public token;
    address public nft;

    constructor(address _token, address _nft) {
        token = _token;
        nft = _nft;
    }

    /** @notice Pausing some functions of contract.
      @dev Available only to admin.
      Prevents calls to functions with `whenNotPaused` modifier.
    */
    function pause() external onlyOwner {
        _pause();
    }

    /** @notice Unpausing functions of contract.
      @dev Available only to adminю
    */
    function unpause() external onlyOwner {
        _unpause();
    }

    function createItem() external onlyOwner {

    }

    function listItem() external {
        
    }

    function buyItem() external {
        
    }

    function cancel() external {
        
    }
}