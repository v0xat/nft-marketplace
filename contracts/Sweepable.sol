// SPDX-License-Identifier: MIT

pragma solidity ^0.8.10;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 @title A base contract which supports an administrative sweep function wherein
 authorized callers may transfer ERC-20 tokens out of this contract.
 This code is a modified version of SuperFarmDAO Sweepable contract.
 https://github.com/SuperFarmDAO/SuperFarm-Contracts/blob/master/contracts/base/Sweepable.sol
 */
contract Sweepable is Ownable {
  using SafeERC20 for IERC20;

  /**
   An event to track a token sweep event.
   @param sweeper The calling address which triggered the sweeep.
   @param token The specific ERC-20 token being swept.
   @param amount The amount of the ERC-20 token being swept.
   @param recipient The recipient of the swept tokens.
   */
  event TokenSweep(address indexed sweeper, IERC20 indexed token, uint256 amount, address indexed recipient);

  /**
   Allow the owner or an approved manager to sweep all of a particular ERC-20
   token from the contract and send it to another address. This function exists
   to allow the shop owner to recover tokens that are otherwise sent directly
   to this contract and get stuck. Provided that sweeping is not locked, this
   is a useful tool to help buyers recover otherwise-lost funds.
   @param _token The token to sweep the balance from.
   @param _amount The amount of token to sweep.
   @param _address The address to send the swept tokens to.
   */
  function sweep(IERC20 _token, uint256 _amount, address _address) external onlyOwner {
    _token.safeTransfer(_address, _amount);
    emit TokenSweep(_msgSender(), _token, _amount, _address);
  }
}