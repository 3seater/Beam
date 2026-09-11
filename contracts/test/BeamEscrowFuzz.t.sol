// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {BeamEscrow} from "../src/BeamEscrow.sol";
import {MockERC20}  from "./mocks/MockERC20.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

contract BeamEscrowFuzzTest is Test {
    BeamEscrow public escrow;
    MockERC20  public token;

    function setUp() public {
        escrow = new BeamEscrow();
        token  = new MockERC20();
    }

    // ─── Property 2: Deposit creation stores exact fields (native ETH) ───────
    //
    // Feature: beam, Property 2: Deposit creation stores exact fields (native ETH)
    //
    // For any non-zero ETH value and any valid (non-zero) signer address,
    // depositNative SHALL store a Deposit where all fields match the inputs
    // and SHALL emit a Deposited event with matching fields.
    //
    // Validates: Requirements 1.1, 1.5
    function testFuzz_depositNative_storesExactFields(
        address signerFuzz,
        uint256 value
    ) public {
        // Feature: beam, Property 2: Deposit creation stores exact fields (native ETH)
        vm.assume(value > 0);
        vm.assume(signerFuzz != address(0));

        // Fund this test contract with exactly the deposit value
        vm.deal(address(this), value);

        // Expect the Deposited event with exact fields before the call
        vm.expectEmit(true, true, false, true, address(escrow));
        emit BeamEscrow.Deposited(1, address(this), address(0), value, signerFuzz);

        uint256 depositId = escrow.depositNative{value: value}(signerFuzz);

        // depositId must be 1 (first deposit in this test run)
        assertEq(depositId, 1, "depositId should be 1");

        BeamEscrow.Deposit memory dep = escrow.getDeposit(depositId);

        assertEq(dep.sender,      address(this), "sender must be msg.sender");
        assertEq(dep.token,       address(0),    "token must be address(0) for native ETH");
        assertEq(dep.amount,      value,         "amount must equal msg.value");
        assertEq(dep.claimSigner, signerFuzz,    "claimSigner must equal provided signer");
        assertEq(dep.claimed,     false,         "claimed must be false on creation");
        assertGt(dep.createdAt,   0,             "createdAt must be set to block.timestamp");
    }

    // ─── Property 3: Deposit creation stores exact fields (ERC-20) ───────────
    //
    // Feature: beam, Property 3: Deposit creation stores exact fields (ERC-20)
    //
    // For any valid ERC-20 token address, non-zero amount, and valid signer
    // address, depositToken SHALL store a Deposit where all fields match the
    // inputs and SHALL emit a Deposited event with matching fields.
    //
    // Validates: Requirements 2.1, 2.2, 2.6
    function testFuzz_depositToken_storesExactFields(
        address signerFuzz,
        uint256 amount
    ) public {
        // Feature: beam, Property 3: Deposit creation stores exact fields (ERC-20)
        vm.assume(amount > 0);
        vm.assume(signerFuzz != address(0));

        // Mint tokens to this test contract and approve the escrow
        token.mint(address(this), amount);
        token.approve(address(escrow), amount);

        // Expect the Deposited event with exact fields before the call
        vm.expectEmit(true, true, false, true, address(escrow));
        emit BeamEscrow.Deposited(1, address(this), address(token), amount, signerFuzz);

        uint256 depositId = escrow.depositToken(address(token), amount, signerFuzz);

        // depositId must be 1 (first deposit in this test run)
        assertEq(depositId, 1, "depositId should be 1");

        BeamEscrow.Deposit memory dep = escrow.getDeposit(depositId);

        assertEq(dep.sender,      address(this),  "sender must be msg.sender");
        assertEq(dep.token,       address(token), "token must equal provided tokenAddress");
        assertEq(dep.amount,      amount,         "amount must equal provided amount");
        assertEq(dep.claimSigner, signerFuzz,     "claimSigner must equal provided signer");
        assertEq(dep.claimed,     false,          "claimed must be false on creation");
        assertGt(dep.createdAt,   0,              "createdAt must be set to block.timestamp");

        // Escrow must hold the tokens after the deposit
        assertEq(
            token.balanceOf(address(escrow)),
            amount,
            "escrow must hold deposited tokens"
        );
        assertEq(
            token.balanceOf(address(this)),
            0,
            "sender balance must be zero after deposit"
        );
    }

    // ─── Property 4: DepositId is monotonically increasing with no gaps ──────
    //
    // Feature: beam, Property 4: DepositId is monotonically increasing with no gaps
    //
    // For any sequence of N successful deposits (1 ≤ N ≤ 50), the returned
    // DepositIds SHALL be exactly 1, 2, …, N in order, with no gaps, no
    // duplicates, and no reuse.
    //
    // Validates: Requirements 1.2, 2.3
    function testFuzz_depositCounter_monotonic(uint8 n) public {
        // Feature: beam, Property 4: DepositId is monotonically increasing with no gaps
        vm.assume(n >= 1 && n <= 50);

        address signerAddr = makeAddr("signer");

        // Fund this test contract with enough ETH for N × 1 ether deposits
        vm.deal(address(this), uint256(n) * 1 ether);

        uint256[] memory ids = new uint256[](n);

        for (uint256 i = 0; i < uint256(n); i++) {
            ids[i] = escrow.depositNative{value: 1 ether}(signerAddr);
        }

        // Assert ids form exactly the sequence 1, 2, ..., N
        for (uint256 i = 0; i < uint256(n); i++) {
            assertEq(
                ids[i],
                i + 1,
                "depositId must equal i+1 (monotonically increasing, no gaps)"
            );
        }
    }

    // ─── Property 7: Invalid inputs to deposit functions always revert ────────
    //
    // Feature: beam, Property 7: Invalid inputs to deposit functions always revert
    //
    // For any call to depositNative with msg.value == 0, or with
    // claimSignerAddress == address(0), or any call to depositToken with
    // amount == 0, zero tokenAddress, or zero claimSignerAddress, the
    // transaction SHALL revert and depositCounter SHALL remain unchanged.
    //
    // Validates: Requirements 1.3, 1.4, 2.4, 2.5
    function testFuzz_deposit_invalidInputsRevert(
        address anyAddress,
        uint256 validValue,
        address validSigner
    ) public {
        // Feature: beam, Property 7: Invalid inputs to deposit functions always revert
        vm.assume(validValue > 0);
        // Cap validValue so vm.deal can fund it without overflow
        vm.assume(validValue <= type(uint96).max);
        vm.assume(validSigner != address(0));
        vm.assume(anyAddress != address(0)); // keep anyAddress as a non-zero token address

        // Fund this test contract with enough ETH to cover the value-bearing calls
        vm.deal(address(this), uint256(type(uint96).max) * 2);

        // ── Test 1: depositNative with msg.value == 0 reverts ZeroValue ─────
        vm.expectRevert(BeamEscrow.ZeroValue.selector);
        escrow.depositNative{value: 0}(validSigner);

        // Counter must still be 0 — no deposit was stored
        assertEq(
            escrow.getDeposit(1).amount,
            0,
            "T1: depositCounter must be unchanged after ZeroValue revert"
        );

        // ── Test 2: depositNative with zero signer reverts ZeroAddress ───────
        vm.expectRevert(
            abi.encodeWithSelector(BeamEscrow.ZeroAddress.selector, "claimSignerAddress")
        );
        escrow.depositNative{value: validValue}(address(0));

        assertEq(
            escrow.getDeposit(1).amount,
            0,
            "T2: depositCounter must be unchanged after ZeroAddress(signer) revert"
        );

        // ── Test 3: depositToken with amount == 0 reverts ZeroAmount ─────────
        vm.expectRevert(BeamEscrow.ZeroAmount.selector);
        escrow.depositToken(anyAddress, 0, validSigner);

        assertEq(
            escrow.getDeposit(1).amount,
            0,
            "T3: depositCounter must be unchanged after ZeroAmount revert"
        );

        // ── Test 4: depositToken with zero tokenAddress reverts ZeroAddress ──
        vm.expectRevert(
            abi.encodeWithSelector(BeamEscrow.ZeroAddress.selector, "tokenAddress")
        );
        escrow.depositToken(address(0), validValue, validSigner);

        assertEq(
            escrow.getDeposit(1).amount,
            0,
            "T4: depositCounter must be unchanged after ZeroAddress(token) revert"
        );

        // ── Test 5: depositToken with zero claimSignerAddress reverts ZeroAddress
        vm.expectRevert(
            abi.encodeWithSelector(BeamEscrow.ZeroAddress.selector, "claimSignerAddress")
        );
        escrow.depositToken(anyAddress, validValue, address(0));

        assertEq(
            escrow.getDeposit(1).amount,
            0,
            "T5: depositCounter must be unchanged after ZeroAddress(claimSigner) revert"
        );
    }

    // ─── Property 5: Claim with valid signature marks deposit claimed and transfers exact amount ───
    //
    // Feature: beam, Property 5: Claim with valid signature marks deposit claimed and transfers exact amount
    //
    // For any valid Deposit (ETH or ERC-20), for any valid recipient address,
    // and for any EIP-191 signature over keccak256(abi.encodePacked(recipientAddress, depositId))
    // produced by the EphemeralKey matching the Deposit's claimSigner, a claim call SHALL:
    //   (a) set dep.claimed = true
    //   (b) transfer exactly dep.amount to recipientAddress
    //   (c) emit a Claimed event with matching fields
    //
    // Validates: Requirements 3.1, 3.2, 3.3, 3.9
    function testFuzz_claim_validSignature_nativeETH(
        uint256 privKey,
        address recipient,
        uint256 amount
    ) public {
        // Feature: beam, Property 5: Claim with valid signature marks deposit claimed and transfers exact amount

        // Constrain privKey to valid secp256k1 scalar range
        vm.assume(privKey > 0);
        vm.assume(privKey < 115792089237316195423570985008687907852837564279074904382605163141518161494337);

        // Constrain amount: non-zero, reasonable cap
        vm.assume(amount > 0 && amount <= 100 ether);

        // Constrain recipient: non-zero, not a precompile, not the escrow, no code
        // (so the ETH transfer succeeds without reverting).
        // Use > 0xffff to exclude system addresses that reject ETH (addresses ≤ 0xffff
        // can be precompiles or reserved system addresses on some EVM implementations).
        vm.assume(uint160(recipient) > 0xffff);
        vm.assume(recipient != address(escrow));
        vm.assume(recipient != address(token));
        vm.assume(recipient.code.length == 0);

        address claimSignerAddr = vm.addr(privKey);

        // Fund and deposit
        vm.deal(address(this), amount);
        uint256 depositId = escrow.depositNative{value: amount}(claimSignerAddr);

        // Build valid EIP-191 signature: keccak256(abi.encodePacked(recipient, depositId))
        bytes32 msgHash = keccak256(abi.encodePacked(recipient, depositId));
        bytes32 ethHash = MessageHashUtils.toEthSignedMessageHash(msgHash);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(privKey, ethHash);
        bytes memory sig = abi.encodePacked(r, s, v);

        // Snapshot recipient balance before claim
        uint256 balBefore = recipient.balance;

        // Expect Claimed event with exact fields
        vm.expectEmit(true, true, false, true, address(escrow));
        emit BeamEscrow.Claimed(depositId, recipient, address(0), amount);

        // Claim
        escrow.claim(depositId, recipient, sig);

        // (a) dep.claimed must be true
        BeamEscrow.Deposit memory dep = escrow.getDeposit(depositId);
        assertTrue(dep.claimed, "dep.claimed must be true after a valid claim");

        // (b) recipient received exactly dep.amount
        assertEq(
            recipient.balance - balBefore,
            amount,
            "recipient ETH balance delta must equal dep.amount"
        );
    }

    function testFuzz_claim_validSignature_erc20(
        uint256 privKey,
        address recipient,
        uint256 amount
    ) public {
        // Feature: beam, Property 5: Claim with valid signature marks deposit claimed and transfers exact amount

        // Constrain privKey to valid secp256k1 scalar range
        vm.assume(privKey > 0);
        vm.assume(privKey < 115792089237316195423570985008687907852837564279074904382605163141518161494337);

        // Constrain amount: non-zero, reasonable cap to keep token arithmetic sane
        vm.assume(amount > 0 && amount <= type(uint128).max);

        // Constrain recipient: non-zero, not the escrow or token contract
        vm.assume(recipient != address(0));
        vm.assume(recipient != address(escrow));
        vm.assume(recipient != address(token));

        address claimSignerAddr = vm.addr(privKey);

        // Mint tokens to this test contract and approve the escrow
        token.mint(address(this), amount);
        token.approve(address(escrow), amount);

        uint256 depositId = escrow.depositToken(address(token), amount, claimSignerAddr);

        // Build valid EIP-191 signature
        bytes32 msgHash = keccak256(abi.encodePacked(recipient, depositId));
        bytes32 ethHash = MessageHashUtils.toEthSignedMessageHash(msgHash);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(privKey, ethHash);
        bytes memory sig = abi.encodePacked(r, s, v);

        // Expect Claimed event with exact fields
        vm.expectEmit(true, true, false, true, address(escrow));
        emit BeamEscrow.Claimed(depositId, recipient, address(token), amount);

        // Claim
        escrow.claim(depositId, recipient, sig);

        // (a) dep.claimed must be true
        BeamEscrow.Deposit memory dep = escrow.getDeposit(depositId);
        assertTrue(dep.claimed, "dep.claimed must be true after a valid ERC-20 claim");

        // (b) recipient token balance equals exactly dep.amount
        assertEq(
            token.balanceOf(recipient),
            amount,
            "recipient token balance must equal dep.amount"
        );

        // escrow must hold zero tokens after the claim
        assertEq(
            token.balanceOf(address(escrow)),
            0,
            "escrow token balance must be zero after claim"
        );
    }

    // ─── Property 6: Cancel returns exact amount to original sender ──────────
    //
    // Feature: beam, Property 6: Cancel returns exact amount to original sender
    //
    // For any unclaimed Deposit (ETH or ERC-20), when the original sender calls
    // cancel, the sender's balance SHALL increase by exactly dep.amount,
    // dep.claimed SHALL become true, and a Cancelled event SHALL be emitted.
    //
    // Validates: Requirements 4.1, 4.2, 4.3, 4.7
    function testFuzz_cancel_returnsExactAmount_nativeETH(
        address sender_,
        uint256 amount
    ) public {
        // Feature: beam, Property 6: Cancel returns exact amount to original sender

        // Constrain amount: non-zero, reasonable cap
        vm.assume(amount > 0 && amount <= 100 ether);

        // Constrain sender: skip address(0), precompiles, and low system addresses
        // (addresses ≤ 0xffff can be system addresses that reject ETH).
        // Also exclude known contracts deployed in this test (escrow, token).
        vm.assume(uint160(sender_) > 0xffff);
        vm.assume(sender_ != address(escrow));
        vm.assume(sender_ != address(token));
        vm.assume(sender_.code.length == 0);

        address signerAddr = makeAddr("signer");

        // Fund sender and deposit
        vm.deal(sender_, amount);
        vm.prank(sender_);
        uint256 depositId = escrow.depositNative{value: amount}(signerAddr);

        // Snapshot sender balance after deposit (ETH is now in escrow)
        uint256 balBefore = sender_.balance;

        // Expect Cancelled event with exact indexed fields
        vm.expectEmit(true, true, false, false, address(escrow));
        emit BeamEscrow.Cancelled(depositId, sender_);

        // Cancel
        vm.prank(sender_);
        escrow.cancel(depositId);

        // dep.claimed must be true
        BeamEscrow.Deposit memory dep = escrow.getDeposit(depositId);
        assertTrue(dep.claimed, "dep.claimed must be true after cancel");

        // sender balance delta must equal exactly dep.amount
        assertEq(
            sender_.balance - balBefore,
            amount,
            "sender ETH balance delta must equal dep.amount after cancel"
        );
    }

    function testFuzz_cancel_returnsExactAmount_erc20(
        address sender_,
        uint256 amount
    ) public {
        // Feature: beam, Property 6: Cancel returns exact amount to original sender

        // Constrain amount: non-zero, reasonable cap
        vm.assume(amount > 0 && amount <= type(uint128).max);

        // Constrain sender: non-zero, not the escrow or token contract
        vm.assume(sender_ != address(0));
        vm.assume(sender_ != address(escrow));
        vm.assume(sender_ != address(token));

        address signerAddr = makeAddr("signer");

        // Mint tokens directly to sender_ and approve escrow
        token.mint(sender_, amount);
        vm.prank(sender_);
        token.approve(address(escrow), amount);

        // Deposit as sender_
        vm.prank(sender_);
        uint256 depositId = escrow.depositToken(address(token), amount, signerAddr);

        // Sender's token balance is now 0 — all tokens are in escrow
        assertEq(token.balanceOf(sender_), 0, "sender token balance must be 0 after deposit");

        // Expect Cancelled event with exact indexed fields
        vm.expectEmit(true, true, false, false, address(escrow));
        emit BeamEscrow.Cancelled(depositId, sender_);

        // Cancel
        vm.prank(sender_);
        escrow.cancel(depositId);

        // dep.claimed must be true
        BeamEscrow.Deposit memory dep = escrow.getDeposit(depositId);
        assertTrue(dep.claimed, "dep.claimed must be true after ERC-20 cancel");

        // sender token balance must be fully restored to dep.amount
        assertEq(
            token.balanceOf(sender_),
            amount,
            "sender token balance must equal dep.amount after cancel"
        );

        // escrow must hold zero tokens
        assertEq(
            token.balanceOf(address(escrow)),
            0,
            "escrow token balance must be zero after cancel"
        );
    }

    // ─── Property 8: Claim with invalid signature always reverts ─────────────
    //
    // Feature: beam, Property 8: Claim with invalid signature always reverts
    //
    // For any valid unclaimed Deposit and any signature that was NOT produced
    // by signing the correct ClaimPayload with the matching EphemeralKey, the
    // claim call SHALL revert and dep.claimed SHALL remain false.
    //
    // Validates: Requirements 3.5, 5.6
    function testFuzz_claim_invalidSignatureReverts(bytes memory badSig) public {
        // Feature: beam, Property 8: Claim with invalid signature always reverts
        //
        // ECDSA.recover requires exactly 65 bytes; constrain to the realistic
        // attack surface (a well-formed but wrong signature).
        vm.assume(badSig.length == 65);

        // ── Create a valid deposit ────────────────────────────────────────
        uint256 depositAmount    = 1 ether;
        uint256 ephemeralPrivKey = 0xBEAD5;
        address claimSignerAddr  = vm.addr(ephemeralPrivKey);
        address recipient        = makeAddr("recipient");

        vm.deal(address(this), depositAmount);
        uint256 depositId = escrow.depositNative{value: depositAmount}(claimSignerAddr);

        // ── Attempt claim with the bad signature — must revert ────────────
        vm.expectRevert();
        escrow.claim(depositId, recipient, badSig);

        // ── dep.claimed must still be false ──────────────────────────────
        BeamEscrow.Deposit memory dep = escrow.getDeposit(depositId);
        assertFalse(
            dep.claimed,
            "dep.claimed must remain false after a failed claim attempt"
        );
    }

    // ─── Property 9: Claimed/cancelled deposits are permanently closed ────────
    //
    // Feature: beam, Property 9: Claimed/cancelled deposits are permanently closed
    //
    // For any Deposit where dep.claimed == true (whether from a previous claim
    // or cancel), any subsequent call to either claim or cancel on the same
    // depositId SHALL revert with AlreadyClaimed.
    //
    // Sequences tested:
    //   1. deposit → claim → attempt second claim  → assert AlreadyClaimed
    //   2. deposit → claim → attempt cancel        → assert AlreadyClaimed
    //
    // Validates: Requirements 3.4, 4.5, 5.5
    function testFuzz_claimedDeposit_permanentlyClosed(
        uint256 ephemeralPrivKey,
        address recipient,
        uint256 depositAmount
    ) public {
        // Feature: beam, Property 9: Claimed/cancelled deposits are permanently closed
        vm.assume(ephemeralPrivKey > 0);
        // vm.addr requires the key to be in the valid secp256k1 scalar range
        vm.assume(ephemeralPrivKey < 115792089237316195423570985008687907852837564279074904382605163141518161494337);
        vm.assume(depositAmount > 0 && depositAmount <= 100 ether);
        vm.assume(recipient != address(0));
        // Skip system/precompile addresses (≤ 0xffff) and known contracts that reject ETH
        vm.assume(uint160(recipient) > 0xffff);
        vm.assume(recipient != address(escrow));
        vm.assume(recipient != address(token));

        address claimSignerAddr = vm.addr(ephemeralPrivKey);

        // Fund and deposit
        vm.deal(address(this), depositAmount);
        uint256 depositId = escrow.depositNative{value: depositAmount}(claimSignerAddr);

        // Build a valid EIP-191 claim signature
        bytes32 msgHash = keccak256(abi.encodePacked(recipient, depositId));
        bytes32 ethHash = MessageHashUtils.toEthSignedMessageHash(msgHash);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(ephemeralPrivKey, ethHash);
        bytes memory sig = abi.encodePacked(r, s, v);

        // Ensure recipient is an EOA that can receive ETH (no code at this address)
        vm.assume(recipient.code.length == 0);

        // First claim succeeds
        escrow.claim(depositId, recipient, sig);

        // dep.claimed must be true
        BeamEscrow.Deposit memory dep = escrow.getDeposit(depositId);
        assertTrue(dep.claimed, "dep.claimed must be true after claim");

        // Sequence 1: second claim must revert with AlreadyClaimed
        vm.expectRevert(
            abi.encodeWithSelector(BeamEscrow.AlreadyClaimed.selector, depositId)
        );
        escrow.claim(depositId, recipient, sig);

        // Sequence 2: cancel after claim must also revert with AlreadyClaimed
        vm.expectRevert(
            abi.encodeWithSelector(BeamEscrow.AlreadyClaimed.selector, depositId)
        );
        escrow.cancel(depositId);
    }

    // ─── Property 9 (cancel path): Cancelled deposits are permanently closed ─
    //
    // Feature: beam, Property 9: Claimed/cancelled deposits are permanently closed
    //
    // Sequences tested:
    //   1. deposit → cancel → attempt cancel again → assert AlreadyClaimed
    //   2. deposit → cancel → attempt claim        → assert AlreadyClaimed
    //
    // Validates: Requirements 3.4, 4.5, 5.5
    function testFuzz_cancelledDeposit_permanentlyClosed(uint256 depositAmount) public {
        // Feature: beam, Property 9: Claimed/cancelled deposits are permanently closed
        vm.assume(depositAmount > 0 && depositAmount <= 100 ether);

        address signerAddr   = makeAddr("signer");
        address recipient    = makeAddr("recipient");
        address depositorAddr = makeAddr("depositor");

        // Fund and deposit as a dedicated EOA so cancel refunds go to an EOA
        vm.deal(depositorAddr, depositAmount);
        vm.prank(depositorAddr);
        uint256 depositId = escrow.depositNative{value: depositAmount}(signerAddr);

        // Cancel succeeds (refund goes back to depositorAddr, which is an EOA)
        vm.prank(depositorAddr);
        escrow.cancel(depositId);

        // dep.claimed must be true after cancel
        BeamEscrow.Deposit memory dep = escrow.getDeposit(depositId);
        assertTrue(dep.claimed, "dep.claimed must be true after cancel");

        // Sequence 1: second cancel must revert with AlreadyClaimed
        vm.expectRevert(
            abi.encodeWithSelector(BeamEscrow.AlreadyClaimed.selector, depositId)
        );
        vm.prank(depositorAddr);
        escrow.cancel(depositId);

        // Sequence 2: claim after cancel must also revert with AlreadyClaimed
        // (use arbitrary bytes as signature — the AlreadyClaimed check fires before sig recovery)
        bytes memory dummySig = new bytes(65);
        vm.expectRevert(
            abi.encodeWithSelector(BeamEscrow.AlreadyClaimed.selector, depositId)
        );
        escrow.claim(depositId, recipient, dummySig);
    }
}
