// SPDX-License-Identifier: MIT

pragma solidity ^0.8.10;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/** @title ACDM token. */
contract ACDMToken is ERC20, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    /** @notice Creates token with custom name and symbol
     * @param name Name of the token.
     * @param symbol Token symbol.
     */
    constructor(
        string memory name,
        string memory symbol
    )
        ERC20(name, symbol)
    {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /** @notice Calls _burn function to "burn" specified amount of tokens.
     * @param from The address to burn tokens on.
     * @param amount The amount of tokens to burn.
     */
    function burn(address from, uint256 amount) external onlyRole(BURNER_ROLE) {
        _burn(from, amount);
    }

    /** @notice Calls _mint function to "mint" specified amount of tokens.
     * @param to The address to mint on.
     * @param amount The amount of tokens to mint.
     */
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }
}