// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {BeamEscrow} from "../src/BeamEscrow.sol";
import {MockERC20}  from "./mocks/MockERC20.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import {ReentrantAttacker} from "./mocks/ReentrantAttacker.sol";

contract BeamEscrowTest is Test {
    BeamEscrow public escrow;
    MockERC20  public token;

    // Test addresses
    address internal sender = makeAddr("sender");
    address internal signer = makeAddr("signer");

    function setUp() public {
        escrow = new BeamEscrow();
        token  = new MockERC20();
        vm.deal(sender, 100 ether);
    }

    // ─── Internal helper: build a valid EIP-191 claim signature ─────────────
    //
    // Mirrors BeamEscrow.claim:
    //   msgHash  = keccak256(abi.encodePacked(recipientAddress, depositId))
    //   ethHash  = MessageHashUtils.toEthSignedMessageHash(msgHash)
    //   signature = abi.encodePacked(r, s, v)
    //
    function _signClaim(
        uint256 privKey,
        address recipient,
        uint256 depositId
    ) internal view returns (bytes memory signature) {
        bytes32 msgHash = keccak256(abi.encodePacked(recipient, depositId));
        bytes32 ethHash = MessageHashUtils.toEthSignedMessageHash(msgHash);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(privKey, ethHash);
        signature = abi.encodePacked(r, s, v);
    }

    // ─── depositNative — happy path ─────────────────────────────────────────

    /// @dev Requirement 1.2 — first depositId == 1
    function test_depositNative_returnsDepositIdOne() public {
        vm.prank(sender);
        uint256 depositId = escrow.depositNative{value: 1 ether}(signer);
        assertEq(depositId, 1, "first depositId should be 1");
    }

    /// @dev Requirements 1.1, 1.2 — stored struct fields match inputs
    function test_depositNative_storesCorrectFields() public {
        uint256 value = 0.5 ether;

        vm.prank(sender);
        uint256 depositId = escrow.depositNative{value: value}(signer);

        BeamEscrow.Deposit memory dep = escrow.getDeposit(depositId);

        assertEq(dep.sender,      sender,     "sender mismatch");
        assertEq(dep.token,       address(0), "token should be address(0) for native ETH");
        assertEq(dep.amount,      value,      "amount should equal msg.value");
        assertEq(dep.claimSigner, signer,     "claimSigner mismatch");
        assertEq(dep.claimed,     false,      "claimed should be false");
        assertGt(dep.createdAt,   0,          "createdAt should be set");
    }

    /// @dev Requirement 1.5 — Deposited event emitted with correct fields
    function test_depositNative_emitsDepositedEvent() public {
        uint256 value = 1 ether;

        // topic1 = depositId (indexed), topic2 = sender (indexed)
        // data = token, amount, claimSignerAddress
        vm.expectEmit(true, true, false, true, address(escrow));
        emit BeamEscrow.Deposited(1, sender, address(0), value, signer);

        vm.prank(sender);
        escrow.depositNative{value: value}(signer);
    }

    /// @dev Requirements 1.1, 1.5 — second deposit gets depositId 2
    function test_depositNative_incrementsDepositId() public {
        vm.startPrank(sender);
        uint256 id1 = escrow.depositNative{value: 1 ether}(signer);
        uint256 id2 = escrow.depositNative{value: 2 ether}(signer);
        vm.stopPrank();

        assertEq(id1, 1, "first depositId should be 1");
        assertEq(id2, 2, "second depositId should be 2");
    }

    // ─── depositNative — revert cases ───────────────────────────────────────

    /// @dev Requirement 1.3 — zero ETH value reverts with ZeroValue
    function test_depositNative_revertsOnZeroValue() public {
        vm.prank(sender);
        vm.expectRevert(BeamEscrow.ZeroValue.selector);
        escrow.depositNative{value: 0}(signer);
    }

    /// @dev Requirement 1.4 — zero signer address reverts with ZeroAddress
    function test_depositNative_revertsOnZeroSignerAddress() public {
        vm.prank(sender);
        vm.expectRevert(
            abi.encodeWithSelector(BeamEscrow.ZeroAddress.selector, "claimSignerAddress")
        );
        escrow.depositNative{value: 1 ether}(address(0));
    }

    /// @dev Requirement 1.3 — state is unchanged after a ZeroValue revert
    function test_depositNative_stateUnchangedAfterZeroValueRevert() public {
        vm.prank(sender);
        vm.expectRevert(BeamEscrow.ZeroValue.selector);
        escrow.depositNative{value: 0}(signer);

        // Counter must still be zero — no deposit was recorded
        BeamEscrow.Deposit memory dep = escrow.getDeposit(1);
        assertEq(dep.amount,  0,          "amount should be 0 for non-existent deposit");
        assertEq(dep.claimed, false,      "claimed should be false for non-existent deposit");
        assertEq(dep.sender,  address(0), "sender should be zero for non-existent deposit");
    }

    /// @dev Requirement 1.4 — state is unchanged after a ZeroAddress revert
    function test_depositNative_stateUnchangedAfterZeroAddressRevert() public {
        vm.prank(sender);
        vm.expectRevert(
            abi.encodeWithSelector(BeamEscrow.ZeroAddress.selector, "claimSignerAddress")
        );
        escrow.depositNative{value: 1 ether}(address(0));

        BeamEscrow.Deposit memory dep = escrow.getDeposit(1);
        assertEq(dep.amount,  0,          "amount should be 0 for non-existent deposit");
        assertEq(dep.sender,  address(0), "sender should be zero for non-existent deposit");
    }

    // ─── depositToken — happy path ───────────────────────────────────────────

    /// @dev Requirements 2.1, 2.2 — stored struct fields match inputs exactly
    function test_depositToken_storesCorrectFields() public {
        uint256 amount = 500e18;

        token.mint(sender, amount);
        vm.prank(sender);
        token.approve(address(escrow), amount);

        vm.prank(sender);
        uint256 depositId = escrow.depositToken(address(token), amount, signer);

        BeamEscrow.Deposit memory dep = escrow.getDeposit(depositId);

        assertEq(dep.sender,      sender,        "sender mismatch");
        assertEq(dep.token,       address(token), "token address mismatch");
        assertEq(dep.amount,      amount,         "amount mismatch");
        assertEq(dep.claimSigner, signer,         "claimSigner mismatch");
        assertEq(dep.claimed,     false,          "claimed should be false");
        assertGt(dep.createdAt,   0,             "createdAt should be non-zero");
    }

    /// @dev Requirement 2.1 — escrow holds the tokens after deposit
    function test_depositToken_transfersTokensToEscrow() public {
        uint256 amount = 1_000e18;

        token.mint(sender, amount);
        vm.prank(sender);
        token.approve(address(escrow), amount);

        vm.prank(sender);
        escrow.depositToken(address(token), amount, signer);

        assertEq(token.balanceOf(address(escrow)), amount, "escrow should hold the tokens");
        assertEq(token.balanceOf(sender),          0,      "sender balance should be zero after deposit");
    }

    /// @dev Requirement 2.6 — Deposited event emitted with correct fields
    function test_depositToken_emitsDepositedEvent() public {
        uint256 amount = 250e18;

        token.mint(sender, amount);
        vm.prank(sender);
        token.approve(address(escrow), amount);

        vm.expectEmit(true, true, false, true, address(escrow));
        emit BeamEscrow.Deposited(1, sender, address(token), amount, signer);

        vm.prank(sender);
        escrow.depositToken(address(token), amount, signer);
    }

    /// @dev Requirement 2.3 — depositId increments correctly across two deposits
    function test_depositToken_incrementsDepositId() public {
        uint256 amount = 100e18;

        token.mint(sender, amount * 2);
        vm.startPrank(sender);
        token.approve(address(escrow), amount * 2);

        uint256 id1 = escrow.depositToken(address(token), amount, signer);
        uint256 id2 = escrow.depositToken(address(token), amount, signer);
        vm.stopPrank();

        assertEq(id1, 1, "first depositId should be 1");
        assertEq(id2, 2, "second depositId should be 2");
    }

    /// @dev Requirements 1.2, 2.3 — counter continues from native deposits (mixed sequence)
    function test_depositToken_idContinuesAfterNativeDeposit() public {
        vm.prank(sender);
        uint256 nativeId = escrow.depositNative{value: 1 ether}(signer);

        uint256 amount = 100e18;
        token.mint(sender, amount);
        vm.prank(sender);
        token.approve(address(escrow), amount);
        vm.prank(sender);
        uint256 tokenId = escrow.depositToken(address(token), amount, signer);

        assertEq(nativeId, 1, "native deposit should have id 1");
        assertEq(tokenId,  2, "token deposit should have id 2");
    }

    // ─── depositToken — revert cases ─────────────────────────────────────────

    /// @dev Requirement 2.4 — zero amount reverts with ZeroAmount
    function test_depositToken_revertsOnZeroAmount() public {
        vm.prank(sender);
        vm.expectRevert(BeamEscrow.ZeroAmount.selector);
        escrow.depositToken(address(token), 0, signer);
    }

    /// @dev Requirement 2.5 — zero tokenAddress reverts with ZeroAddress
    function test_depositToken_revertsOnZeroTokenAddress() public {
        vm.prank(sender);
        vm.expectRevert(
            abi.encodeWithSelector(BeamEscrow.ZeroAddress.selector, "tokenAddress")
        );
        escrow.depositToken(address(0), 100e18, signer);
    }

    /// @dev Requirement 2.5 — zero claimSignerAddress reverts with ZeroAddress
    function test_depositToken_revertsOnZeroSignerAddress() public {
        vm.prank(sender);
        vm.expectRevert(
            abi.encodeWithSelector(BeamEscrow.ZeroAddress.selector, "claimSignerAddress")
        );
        escrow.depositToken(address(token), 100e18, address(0));
    }

    /// @dev Requirement 2.7 — transferFrom returning false reverts with TokenTransferFailed
    function test_depositToken_revertsWhenTransferFromReturnsFalse() public {
        uint256 amount = 100e18;

        token.setTransferFromResult(false);

        vm.prank(sender);
        vm.expectRevert(BeamEscrow.TokenTransferFailed.selector);
        escrow.depositToken(address(token), amount, signer);
    }

    /// @dev Requirement 2.7 — no deposit struct is written when transferFrom fails
    function test_depositToken_noStateWrittenOnTransferFailure() public {
        uint256 amount = 100e18;
        token.setTransferFromResult(false);

        vm.prank(sender);
        vm.expectRevert(BeamEscrow.TokenTransferFailed.selector);
        escrow.depositToken(address(token), amount, signer);

        BeamEscrow.Deposit memory dep = escrow.getDeposit(1);
        assertEq(dep.amount,  0,          "amount should be 0 - no deposit was recorded");
        assertEq(dep.sender,  address(0), "sender should be zero - no deposit was recorded");
        assertEq(dep.claimed, false,      "claimed should be false - no deposit was recorded");
    }

    // ─── claim — happy path: native ETH ─────────────────────────────────────

    /// @dev Requirements 3.1, 3.2, 3.9 — deposit ETH, claim, verify balance delta and event
    function test_claim_nativeETH_happyPath() public {
        uint256 amount = 1 ether;
        uint256 ephemeralPrivKey = 0xA11CE;
        address claimSigner_ = vm.addr(ephemeralPrivKey);
        address recipient    = makeAddr("recipient");

        vm.prank(sender);
        uint256 depositId = escrow.depositNative{value: amount}(claimSigner_);

        bytes memory sig = _signClaim(ephemeralPrivKey, recipient, depositId);

        vm.expectEmit(true, true, false, true, address(escrow));
        emit BeamEscrow.Claimed(depositId, recipient, address(0), amount);

        uint256 balBefore = recipient.balance;
        escrow.claim(depositId, recipient, sig);

        assertEq(recipient.balance - balBefore, amount, "recipient ETH balance delta should equal deposit");

        BeamEscrow.Deposit memory dep = escrow.getDeposit(depositId);
        assertTrue(dep.claimed, "dep.claimed should be true after claim");
    }

    // ─── claim — happy path: ERC-20 ─────────────────────────────────────────

    /// @dev Requirements 3.1, 3.3, 3.9 — deposit ERC-20, claim, verify token balance and event
    function test_claim_erc20_happyPath() public {
        uint256 amount = 500e18;
        uint256 ephemeralPrivKey = 0xB0B;
        address claimSigner_ = vm.addr(ephemeralPrivKey);
        address recipient    = makeAddr("recipient");

        token.mint(sender, amount);
        vm.startPrank(sender);
        token.approve(address(escrow), amount);
        uint256 depositId = escrow.depositToken(address(token), amount, claimSigner_);
        vm.stopPrank();

        bytes memory sig = _signClaim(ephemeralPrivKey, recipient, depositId);

        vm.expectEmit(true, true, false, true, address(escrow));
        emit BeamEscrow.Claimed(depositId, recipient, address(token), amount);

        escrow.claim(depositId, recipient, sig);

        assertEq(token.balanceOf(recipient),       amount, "recipient should hold deposited tokens");
        assertEq(token.balanceOf(address(escrow)), 0,      "escrow balance should be zero after claim");

        BeamEscrow.Deposit memory dep = escrow.getDeposit(depositId);
        assertTrue(dep.claimed, "dep.claimed should be true after claim");
    }

    // ─── claim — revert: already claimed ────────────────────────────────────

    /// @dev Requirement 3.4 — second claim on same deposit reverts with AlreadyClaimed
    function test_claim_revertsAlreadyClaimed() public {
        uint256 amount = 1 ether;
        uint256 ephemeralPrivKey = 0xC0DE;
        address claimSigner_ = vm.addr(ephemeralPrivKey);
        address recipient    = makeAddr("recipient");

        vm.prank(sender);
        uint256 depositId = escrow.depositNative{value: amount}(claimSigner_);

        bytes memory sig = _signClaim(ephemeralPrivKey, recipient, depositId);

        // First claim succeeds
        escrow.claim(depositId, recipient, sig);

        // Second claim must revert
        vm.expectRevert(
            abi.encodeWithSelector(BeamEscrow.AlreadyClaimed.selector, depositId)
        );
        escrow.claim(depositId, recipient, sig);
    }

    // ─── claim — revert: invalid signature ──────────────────────────────────

    /// @dev Requirements 3.5, 5.6 — signature from a different key reverts with InvalidSignature
    function test_claim_revertsInvalidSignature() public {
        uint256 amount = 1 ether;
        uint256 ephemeralPrivKey = 0xFACE;   // real signer
        uint256 wrongPrivKey     = 0xBAD1;   // unrelated key
        address claimSigner_ = vm.addr(ephemeralPrivKey);
        address recipient    = makeAddr("recipient");

        vm.prank(sender);
        uint256 depositId = escrow.depositNative{value: amount}(claimSigner_);

        // Sign with a DIFFERENT private key — ECDSA recovery succeeds but
        // the recovered address != claimSigner, so InvalidSignature fires.
        bytes memory badSig = _signClaim(wrongPrivKey, recipient, depositId);

        vm.expectRevert(BeamEscrow.InvalidSignature.selector);
        escrow.claim(depositId, recipient, badSig);

        BeamEscrow.Deposit memory dep = escrow.getDeposit(depositId);
        assertFalse(dep.claimed, "dep.claimed must remain false after failed claim");
    }

    // ─── claim — revert: zero recipient ─────────────────────────────────────

    /// @dev Requirement 3.6 — zero recipientAddress reverts with ZeroAddress
    function test_claim_revertsZeroRecipient() public {
        uint256 amount = 1 ether;
        uint256 ephemeralPrivKey = 0xDEAD;
        address claimSigner_ = vm.addr(ephemeralPrivKey);

        vm.prank(sender);
        uint256 depositId = escrow.depositNative{value: amount}(claimSigner_);

        bytes memory sig = _signClaim(ephemeralPrivKey, address(0), depositId);

        vm.expectRevert(
            abi.encodeWithSelector(BeamEscrow.ZeroAddress.selector, "recipientAddress")
        );
        escrow.claim(depositId, address(0), sig);
    }

    // ─── claim — revert: non-existent deposit ───────────────────────────────

    /// @dev Requirement 3.7 — claim on never-created depositId reverts with DepositDoesNotExist
    function test_claim_revertsNonExistentDeposit() public {
        uint256 nonExistentId = 999;
        address recipient     = makeAddr("recipient");
        bytes memory sig      = new bytes(65);

        vm.expectRevert(
            abi.encodeWithSelector(BeamEscrow.DepositDoesNotExist.selector, nonExistentId)
        );
        escrow.claim(nonExistentId, recipient, sig);
    }

    // ─── cancel — happy path ─────────────────────────────────────────────────

    /// @dev Requirements 4.1, 4.2, 4.7 — cancel native ETH: balance restored, claimed true, event
    function test_cancel_nativeETH_happyPath() public {
        uint256 depositAmount = 1 ether;

        vm.prank(sender);
        uint256 depositId = escrow.depositNative{value: depositAmount}(signer);

        // Snapshot balance after deposit (tx gas already consumed)
        uint256 balanceBefore = sender.balance;

        // Both indexed fields must match
        vm.expectEmit(true, true, false, false, address(escrow));
        emit BeamEscrow.Cancelled(depositId, sender);

        vm.prank(sender);
        escrow.cancel(depositId);

        assertEq(sender.balance, balanceBefore + depositAmount, "sender ETH balance should be fully restored");

        BeamEscrow.Deposit memory dep = escrow.getDeposit(depositId);
        assertTrue(dep.claimed, "dep.claimed should be true after cancel");
    }

    /// @dev Requirements 4.1, 4.3, 4.7 — cancel ERC-20: token balance restored, claimed true, event
    function test_cancel_erc20_happyPath() public {
        uint256 amount = 750e18;

        token.mint(sender, amount);
        vm.prank(sender);
        token.approve(address(escrow), amount);

        vm.prank(sender);
        uint256 depositId = escrow.depositToken(address(token), amount, signer);

        assertEq(token.balanceOf(sender), 0, "sender token balance should be 0 after deposit");

        vm.expectEmit(true, true, false, false, address(escrow));
        emit BeamEscrow.Cancelled(depositId, sender);

        vm.prank(sender);
        escrow.cancel(depositId);

        assertEq(token.balanceOf(sender), amount, "sender token balance should be fully restored after cancel");

        BeamEscrow.Deposit memory dep = escrow.getDeposit(depositId);
        assertTrue(dep.claimed, "dep.claimed should be true after cancel");
    }

    // ─── cancel — revert cases ────────────────────────────────────────────────

    /// @dev Requirement 4.4 — wrong caller reverts with NotSender
    function test_cancel_revertsWrongCaller() public {
        vm.prank(sender);
        uint256 depositId = escrow.depositNative{value: 1 ether}(signer);

        address attacker = makeAddr("attacker");

        vm.prank(attacker);
        vm.expectRevert(
            abi.encodeWithSelector(BeamEscrow.NotSender.selector, depositId)
        );
        escrow.cancel(depositId);
    }

    /// @dev Requirement 4.5 — double-cancel reverts with AlreadyClaimed
    function test_cancel_revertsAlreadyClaimed() public {
        vm.prank(sender);
        uint256 depositId = escrow.depositNative{value: 1 ether}(signer);

        vm.prank(sender);
        escrow.cancel(depositId);

        vm.prank(sender);
        vm.expectRevert(
            abi.encodeWithSelector(BeamEscrow.AlreadyClaimed.selector, depositId)
        );
        escrow.cancel(depositId);
    }

    /// @dev Requirement 4.6 — cancel on non-existent deposit reverts with DepositDoesNotExist
    function test_cancel_revertsNonExistentDeposit() public {
        uint256 nonExistentId = 999;

        vm.prank(sender);
        vm.expectRevert(
            abi.encodeWithSelector(BeamEscrow.DepositDoesNotExist.selector, nonExistentId)
        );
        escrow.cancel(nonExistentId);
    }

    /// @dev Requirements 4.5, 5.5 — cancel after a successful claim reverts with AlreadyClaimed
    function test_cancel_revertsAlreadyClaimedAfterClaim() public {
        uint256 ephemeralPrivKey = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
        address claimSignerAddr  = vm.addr(ephemeralPrivKey);

        vm.prank(sender);
        uint256 depositId = escrow.depositNative{value: 1 ether}(claimSignerAddr);

        address recipient = makeAddr("recipient");
        bytes memory sig  = _signClaim(ephemeralPrivKey, recipient, depositId);

        // Claim succeeds
        escrow.claim(depositId, recipient, sig);

        // Cancel must now revert — deposit is in terminal claimed state
        vm.prank(sender);
        vm.expectRevert(
            abi.encodeWithSelector(BeamEscrow.AlreadyClaimed.selector, depositId)
        );
        escrow.cancel(depositId);
    }

    // ─── Reentrancy attack — claim ──────────────────────────────────────────

    /// @dev Requirements 3.10, 4.8, 5.2
    ///      A reentrant call to claim() inside receive() must be blocked by
    ///      ReentrancyGuard and must NOT transfer funds a second time.
    function test_reentrancy_claimReverts() public {
        // ── Setup ─────────────────────────────────────────────────────────
        uint256 depositAmount = 1 ether;

        // Deterministic private key → derive claimSigner address
        uint256 ephemeralPrivKey = 0xA11CE;
        address claimSigner = vm.addr(ephemeralPrivKey);

        // Deploy the ReentrantAttacker; it will be both caller and ETH recipient
        ReentrantAttacker attacker = new ReentrantAttacker(escrow);
        address attackerAddr = address(attacker);

        // Sender deposits ETH; signing authority = claimSigner
        vm.deal(sender, depositAmount);
        vm.prank(sender);
        uint256 depositId = escrow.depositNative{value: depositAmount}(claimSigner);

        // Build a valid EIP-191 ClaimPayload where recipient == attacker address
        bytes32 msgHash = keccak256(abi.encodePacked(attackerAddr, depositId));
        bytes32 ethHash = MessageHashUtils.toEthSignedMessageHash(msgHash);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(ephemeralPrivKey, ethHash);
        bytes memory signature = abi.encodePacked(r, s, v);

        uint256 attackerBalanceBefore = attackerAddr.balance;

        // ── Execute the attack ────────────────────────────────────────────
        // The outer claim() should succeed and transfer ETH to the attacker.
        // Inside receive(), the attacker re-enters claim() — that call must revert.
        attacker.attack(depositId, attackerAddr, signature);

        // ── Assertions ────────────────────────────────────────────────────

        // 1. ReentrancyGuard must have blocked the reentrant call
        assertTrue(
            attacker.reentrantCallReverted(),
            "ReentrancyGuard must block the reentrant claim call"
        );

        // 2. The legitimate outer claim succeeded
        assertTrue(
            attacker.outerCallSucceeded(),
            "The legitimate outer claim must have succeeded"
        );

        // 3. ETH was transferred exactly once — no double-spend
        assertEq(
            attackerAddr.balance - attackerBalanceBefore,
            depositAmount,
            "Attacker should receive the deposit amount exactly once"
        );

        // 4. Deposit is permanently closed after the attack
        BeamEscrow.Deposit memory dep = escrow.getDeposit(depositId);
        assertTrue(dep.claimed, "Deposit must be marked claimed after the attack");
    }
}
