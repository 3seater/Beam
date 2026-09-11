// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {BeamEscrow} from "../../src/BeamEscrow.sol";

/**
 * @title ReentrantAttacker
 * @notice Mock contract that attempts a reentrancy attack against BeamEscrow.claim().
 *
 *  Flow:
 *   1. Test calls attack(depositId, recipient, signature).
 *   2. attack() forwards the call to escrow.claim(), which transfers ETH to this contract.
 *   3. receive() fires during that ETH transfer and immediately tries to call
 *      escrow.claim() again with the same arguments.
 *   4. The second call should revert due to ReentrancyGuard; that revert is
 *      caught and recorded in `reentrantCallReverted`.
 *
 *  Requirements: 3.10, 4.8, 5.2
 */
contract ReentrantAttacker {
    BeamEscrow public immutable escrow;

    // Set to true when the reentrant call inside receive() reverted
    bool public reentrantCallReverted;
    // Set to true if the outer attack() call itself succeeded
    bool public outerCallSucceeded;

    // Stored so receive() can replay the same call
    uint256 private _depositId;
    address private _recipient;
    bytes   private _signature;

    constructor(BeamEscrow escrowAddress) {
        escrow = escrowAddress;
    }

    /**
     * @notice Initiate the attack: call claim() on the escrow.
     *         The ETH refund from claim() will trigger receive(), which retries.
     */
    function attack(
        uint256 depositId,
        address recipient,
        bytes calldata signature
    ) external {
        _depositId = depositId;
        _recipient = recipient;
        _signature = signature;

        // This is the legitimate first claim — it should succeed.
        // If nonReentrant blocks this (it shouldn't), the whole tx reverts.
        escrow.claim(depositId, recipient, signature);
        outerCallSucceeded = true;
    }

    /**
     * @dev Called when ETH is sent to this contract (during the ETH transfer
     *      inside escrow.claim()). Attempts to re-enter claim() with the same args.
     *      ReentrancyGuard must cause this second call to revert.
     */
    receive() external payable {
        // Attempt reentrant claim — expect this to revert
        try escrow.claim(_depositId, _recipient, _signature) {
            // If we somehow reach here, the reentrancy guard did NOT protect
            reentrantCallReverted = false;
        } catch {
            // Expected path: ReentrancyGuard reverted the reentrant call
            reentrantCallReverted = true;
        }
    }
}
