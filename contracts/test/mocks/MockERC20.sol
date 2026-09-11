// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MockERC20
 * @notice Minimal ERC-20 mock for unit tests.
 *
 *  - Tracks balances and allowances in mappings.
 *  - `mint` lets test harnesses fund accounts.
 *  - `setTransferFromResult` overrides the bool returned by `transferFrom`
 *    so tests can simulate a failing token without reverting on the call.
 */
contract MockERC20 {
    // ─── ERC-20 metadata ────────────────────────────────────────────────────
    string public name     = "Mock Token";
    string public symbol   = "MOCK";
    uint8  public decimals = 18;

    // ─── Storage ────────────────────────────────────────────────────────────
    mapping(address => uint256)                     public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    /// @dev When false, transferFrom returns false instead of reverting.
    bool private _transferFromResult = true;

    // ─── Events ─────────────────────────────────────────────────────────────
    event Transfer(address indexed from, address indexed to,            uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    // ─── Test helpers ────────────────────────────────────────────────────────

    /// @notice Credit `amount` tokens to `to` without requiring a transfer.
    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    /// @notice Set the return value of future `transferFrom` calls.
    ///         Use `setTransferFromResult(false)` to simulate a transfer failure.
    function setTransferFromResult(bool result) external {
        _transferFromResult = result;
    }

    // ─── ERC-20 interface ────────────────────────────────────────────────────

    function totalSupply() external view returns (uint256 total) {
        // Not needed for escrow tests; return a placeholder.
        total = 0;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "MockERC20: insufficient balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[to]         += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) external returns (bool) {
        // Honour the override flag — return false without changing state.
        if (!_transferFromResult) return false;

        require(balanceOf[from] >= amount,             "MockERC20: insufficient balance");
        require(allowance[from][msg.sender] >= amount, "MockERC20: insufficient allowance");

        balanceOf[from]              -= amount;
        balanceOf[to]                += amount;
        allowance[from][msg.sender]  -= amount;

        emit Transfer(from, to, amount);
        return true;
    }
}
