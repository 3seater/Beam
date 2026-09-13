// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @notice Separate escrow for atomic Enso bundles. Existing Beam deposits are unaffected.
contract SpectrumEscrow is ReentrancyGuard {
    using SafeERC20 for IERC20;
    struct Bundle {
        address sender;
        address claimSigner;
        bool claimed;
        uint256 createdAt;
        bytes32 presetId;
        address[] tokens;
        uint256[] amounts;
    }
    mapping(uint256 => Bundle) private bundles;
    uint256 private counter;
    event BundleDeposited(uint256 indexed depositId, address indexed sender, address claimSigner, bytes32 presetId);
    event BundleClaimed(uint256 indexed depositId, address indexed recipient);
    event BundleCancelled(uint256 indexed depositId, address indexed sender);
    error InvalidBundle();
    error Unavailable();
    error Unauthorized();

    /// @dev Pulls only the specified amounts from the caller (Enso router), never
    ///      from sender. Sender is the cancellation beneficiary of these funds.
    function depositBundle(address sender, address claimSigner, address[] calldata tokens, uint256[] calldata amounts, bytes32 presetId)
        external nonReentrant returns (uint256 depositId)
    {
        if (sender == address(0) || claimSigner == address(0) || tokens.length < 2 || tokens.length > 8 || tokens.length != amounts.length) revert InvalidBundle();
        depositId = ++counter;
        Bundle storage b = bundles[depositId];
        b.sender = sender; b.claimSigner = claimSigner; b.createdAt = block.timestamp; b.presetId = presetId;
        for (uint256 i; i < tokens.length; ++i) {
            if (tokens[i] == address(0) || amounts[i] == 0) revert InvalidBundle();
            for (uint256 j; j < i; ++j) if (tokens[i] == tokens[j]) revert InvalidBundle();
            IERC20 token = IERC20(tokens[i]);
            uint256 beforeBalance = token.balanceOf(address(this));
            token.safeTransferFrom(msg.sender, address(this), amounts[i]);
            uint256 received = token.balanceOf(address(this)) - beforeBalance;
            if (received == 0) revert InvalidBundle();
            b.tokens.push(tokens[i]); b.amounts.push(received);
        }
        emit BundleDeposited(depositId, sender, claimSigner, presetId);
    }

    function getBundle(uint256 id) external view returns (address sender, address claimSigner, bool claimed, uint256 createdAt, bytes32 presetId, address[] memory tokens, uint256[] memory amounts) {
        Bundle storage b = bundles[id];
        return (b.sender, b.claimSigner, b.claimed, b.createdAt, b.presetId, b.tokens, b.amounts);
    }

    function claim(uint256 id, address recipient, bytes calldata signature) external nonReentrant {
        Bundle storage b = bundles[id];
        if (b.sender == address(0) || b.claimed) revert Unavailable();
        bytes32 digest = MessageHashUtils.toEthSignedMessageHash(keccak256(abi.encode(block.chainid, address(this), id, recipient)));
        if (recipient == address(0) || ECDSA.recover(digest, signature) != b.claimSigner) revert Unauthorized();
        b.claimed = true;
        _release(b, recipient);
        emit BundleClaimed(id, recipient);
    }

    function cancel(uint256 id) external nonReentrant {
        Bundle storage b = bundles[id];
        if (b.sender == address(0) || b.claimed) revert Unavailable();
        if (msg.sender != b.sender) revert Unauthorized();
        b.claimed = true;
        _release(b, b.sender);
        emit BundleCancelled(id, b.sender);
    }

    function _release(Bundle storage b, address recipient) private {
        for (uint256 i; i < b.tokens.length; ++i) IERC20(b.tokens[i]).safeTransfer(recipient, b.amounts[i]);
    }
}
