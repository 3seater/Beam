// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract BeamEscrow is ReentrancyGuard {
    using ECDSA for bytes32;

    // ─── Storage ────────────────────────────────────────────────

    struct Deposit {
        address sender;
        address token;       // address(0) = native ETH
        uint256 amount;
        address claimSigner;
        bool    claimed;
        uint256 createdAt;
    }

    mapping(uint256 => Deposit) private deposits;
    uint256 private depositCounter;

    // ─── Events ─────────────────────────────────────────────────

    event Deposited(
        uint256 indexed depositId,
        address indexed sender,
        address token,
        uint256 amount,
        address claimSignerAddress
    );

    event Claimed(
        uint256 indexed depositId,
        address indexed recipientAddress,
        address token,
        uint256 amount
    );

    event Cancelled(
        uint256 indexed depositId,
        address indexed sender
    );

    // ─── Custom Errors ───────────────────────────────────────────

    error ZeroValue();
    error ZeroAddress(string param);
    error ZeroAmount();
    error DepositDoesNotExist(uint256 depositId);
    error AlreadyClaimed(uint256 depositId);
    error NotSender(uint256 depositId);
    error InvalidSignature();
    error TokenTransferFailed();
    error ETHTransferFailed();

    // ─── External Functions ──────────────────────────────────────

    /**
     * @notice Deposit native ETH. Returns a unique depositId.
     * @param claimSignerAddress Public address derived from the EphemeralKey.
     */
    function depositNative(address claimSignerAddress)
        external
        payable
        returns (uint256 depositId)
    {
        if (msg.value == 0) revert ZeroValue();
        if (claimSignerAddress == address(0)) revert ZeroAddress("claimSignerAddress");

        depositId = ++depositCounter;
        deposits[depositId] = Deposit({
            sender:      msg.sender,
            token:       address(0),
            amount:      msg.value,
            claimSigner: claimSignerAddress,
            claimed:     false,
            createdAt:   block.timestamp
        });

        emit Deposited(depositId, msg.sender, address(0), msg.value, claimSignerAddress);
    }

    /**
     * @notice Deposit ERC-20 tokens. Caller must approve BeamEscrow first.
     * @param tokenAddress    The ERC-20 token contract address.
     * @param amount          The number of tokens to deposit (in token units).
     * @param claimSignerAddress Public address derived from the EphemeralKey.
     */
    function depositToken(
        address tokenAddress,
        uint256 amount,
        address claimSignerAddress
    )
        external
        returns (uint256 depositId)
    {
        if (amount == 0) revert ZeroAmount();
        if (tokenAddress == address(0)) revert ZeroAddress("tokenAddress");
        if (claimSignerAddress == address(0)) revert ZeroAddress("claimSignerAddress");

        // Checks-Effects: record deposit before the external call (CEI pattern)
        depositId = ++depositCounter;
        deposits[depositId] = Deposit({
            sender:      msg.sender,
            token:       tokenAddress,
            amount:      amount,
            claimSigner: claimSignerAddress,
            claimed:     false,
            createdAt:   block.timestamp
        });

        // Interactions: pull tokens from sender via low-level call to handle
        // non-standard ERC-20 tokens that don't return a bool
        (bool ok, bytes memory data) = tokenAddress.call(
            abi.encodeWithSignature(
                "transferFrom(address,address,uint256)",
                msg.sender, address(this), amount
            )
        );
        if (!ok || (data.length > 0 && !abi.decode(data, (bool)))) {
            revert TokenTransferFailed();
        }

        emit Deposited(depositId, msg.sender, tokenAddress, amount, claimSignerAddress);
    }

    /**
     * @notice Claim funds using a valid EIP-191 signature from the EphemeralKey.
     * @param depositId        The deposit to claim.
     * @param recipientAddress Where to send the funds.
     * @param signature        EIP-191 personal_sign over
     *                         keccak256(abi.encodePacked(recipientAddress, depositId)).
     */
    function claim(
        uint256 depositId,
        address recipientAddress,
        bytes calldata signature
    )
        external
        nonReentrant
    {
        Deposit storage dep = deposits[depositId];

        // ── Checks ───────────────────────────────────────────────
        if (dep.amount == 0 && !dep.claimed) revert DepositDoesNotExist(depositId);
        if (dep.claimed) revert AlreadyClaimed(depositId);
        if (recipientAddress == address(0)) revert ZeroAddress("recipientAddress");

        bytes32 msgHash = keccak256(abi.encodePacked(recipientAddress, depositId));
        bytes32 ethHash = MessageHashUtils.toEthSignedMessageHash(msgHash);
        address recovered = ECDSA.recover(ethHash, signature);
        if (recovered == address(0) || recovered != dep.claimSigner) revert InvalidSignature();

        // ── Effects ───────────────────────────────────────────────
        dep.claimed = true;
        address token  = dep.token;
        uint256 amount = dep.amount;

        // ── Interactions ──────────────────────────────────────────
        if (token == address(0)) {
            (bool ok,) = recipientAddress.call{value: amount}("");
            if (!ok) revert ETHTransferFailed();
        } else {
            (bool ok, bytes memory data) = token.call(
                abi.encodeWithSignature("transfer(address,uint256)", recipientAddress, amount)
            );
            if (!ok || (data.length > 0 && !abi.decode(data, (bool)))) revert TokenTransferFailed();
        }

        emit Claimed(depositId, recipientAddress, token, amount);
    }

    /**
     * @notice Cancel an unclaimed deposit and recover the full amount.
     *         Only the original sender may cancel.
     * @param depositId The deposit to cancel.
     */
    function cancel(uint256 depositId)
        external
        nonReentrant
    {
        Deposit storage dep = deposits[depositId];

        // ── Checks ───────────────────────────────────────────────
        if (dep.amount == 0 && !dep.claimed) revert DepositDoesNotExist(depositId);
        if (dep.claimed) revert AlreadyClaimed(depositId);
        if (dep.sender != msg.sender) revert NotSender(depositId);

        // ── Effects ───────────────────────────────────────────────
        dep.claimed = true;
        address token  = dep.token;
        uint256 amount = dep.amount;
        address sender = dep.sender;

        // ── Interactions ──────────────────────────────────────────
        if (token == address(0)) {
            (bool ok,) = sender.call{value: amount}("");
            if (!ok) revert ETHTransferFailed();
        } else {
            (bool ok, bytes memory data) = token.call(
                abi.encodeWithSignature("transfer(address,uint256)", sender, amount)
            );
            if (!ok || (data.length > 0 && !abi.decode(data, (bool)))) revert TokenTransferFailed();
        }

        emit Cancelled(depositId, sender);
    }

    /**
     * @notice Read a Deposit record by ID.
     * @param depositId The deposit to query.
     * @return The full Deposit struct (zeroed fields if depositId never used).
     */
    function getDeposit(uint256 depositId)
        external
        view
        returns (Deposit memory)
    {
        return deposits[depositId];
    }
}
