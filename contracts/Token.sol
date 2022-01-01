// SPDX-License-Identifier: MIT

pragma solidity ^0.8.10;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/** @title ERC20 token. */
contract Token is ERC20, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    uint256 private feeRate;
    address private feeRecipient;
    address public dao;
    mapping(address => bool) private whitelisted;
    
    event AddToWhitelist(address indexed caller, address account);
    event RemoveFromWhitelist(address indexed caller, address account);
    event ChangeFeeRate(address indexed caller, uint256 feeRate);
    event ChangeFeeRecipient(address indexed caller, address feeRecipient);

    /** @notice Creates token with custom name, symbol, and transfer fee
     * @param name Name of the token.
     * @param symbol Token symbol.
     * @param _feeRate Transfer fee (percent).
     */
    constructor(
        string memory name,
        string memory symbol,
        uint256 _feeRate
    )
        ERC20(name, symbol)
    {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        feeRate = _feeRate;
        feeRecipient = msg.sender;
    }

    /** @notice Initializes token with DAO contract.
     * @dev Sets DEFAULT_ADMIN_ROLE to DAO and revokes it from token owner.
     * @param _dao The address of the DAO contract.
     */
    function initialize(address _dao) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(DEFAULT_ADMIN_ROLE, msg.sender);
        dao = _dao;
        _setupRole(DEFAULT_ADMIN_ROLE, _dao);
    }

    /// @notice Returns current transfer fee rate.
    function getFeeRate() external view returns (uint) {
        return feeRate;
    }

    /// @notice Returns the address of transfer fee recipient.
    function getFeeRecipient() external view returns (address) {
        return feeRecipient;
    }

    /** @notice Checks if user is in whitelist.
     * @param account Address of the user to check.
     * @return True if user is in the list.
     */
    function isWhitelisted(address account) external view returns (bool) {
        return whitelisted[account];
    }

    /** @notice Adds user to whitelist.
     * @dev Whitelisted users dont have to pay transfer fee.
     * @param account Address of the user to whitelist.
     */
    function addToWhitelist(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        whitelisted[account] = true;
        emit AddToWhitelist(msg.sender, account);
    }

    /** @notice Removes user from whitelist.
     * @param account Address of the user to remove from whitelist.
     */
    function removeFromWhitelist(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        whitelisted[account] = false;
        emit RemoveFromWhitelist(msg.sender, account);
    }

    /** @notice Changes `feeRate`.
     * @param value New fee rate (pct).
     */
    function changeFeeRate(uint256 value) external onlyRole(DEFAULT_ADMIN_ROLE) {
        feeRate = value;
        emit ChangeFeeRate(msg.sender, value);
    }

    /** @notice Changes `feeRecipient`.
     * @param to Address of new recipient.
     */
    function changeFeeRecipient(address to) external onlyRole(DEFAULT_ADMIN_ROLE) {
        feeRecipient = to;
        emit ChangeFeeRecipient(msg.sender, to);
    }

    /** @notice Calls burn function to "burn" specified amount of tokens.
     * @param from The address to burn tokens on.
     * @param amount The amount of tokens to burn.
     */
    function burn(address from, uint256 amount) external onlyRole(BURNER_ROLE) {
        _burn(from, amount);
    }

    /** @notice Calls mint function to "mint" specified amount of tokens.
     * @param to The address to mint on.
     * @param amount The amount of tokens to mint.
     */
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }

    /** @notice Hook that is called before any transfer of tokens.
     * @dev Charges fee from address `from` in favor of `_feeRecipient` if 
     * he is not in the whitelist.
     *
     * @param from The address of spender.
     * @param to The address of recipient.
     * @param amount The amount of tokens to transfer.
     */
    function _beforeTokenTransfer(address from, address to, uint256 amount) internal virtual override {
        if (!whitelisted[from] && from != address(0) && to != address(0)) {
            uint256 fee = amount * feeRate / 10000;

            require(balanceOf(from) >= (amount + fee), "Not enough to pay fee");

            _burn(from, fee);
            _mint(feeRecipient, fee);
        }
    }
}