// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import {Test} from "forge-std/Test.sol";
import {SpectrumEscrow} from "../src/SpectrumEscrow.sol";
import {MockERC20} from "./mocks/MockERC20.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

contract SpectrumEscrowTest is Test {
    SpectrumEscrow escrow;
    MockERC20 a;
    MockERC20 b;
    address sender = address(0x123);
    uint256 signerKey = 77;
    function setUp() public {
        escrow = new SpectrumEscrow(); a = new MockERC20(); b = new MockERC20();
        a.mint(address(this), 100 ether); b.mint(address(this), 100 ether);
        a.approve(address(escrow), 100 ether); b.approve(address(escrow), 100 ether);
    }
    function deposit() internal returns (uint256) {
        address[] memory tokens = new address[](2); tokens[0] = address(a); tokens[1] = address(b);
        uint256[] memory amounts = new uint256[](2); amounts[0] = 2 ether; amounts[1] = 3 ether;
        return escrow.depositBundle(sender, vm.addr(signerKey), tokens, amounts, keccak256("test"));
    }
    function signature(uint256 id, address recipient, uint256 key) internal view returns (bytes memory) {
        bytes32 digest = MessageHashUtils.toEthSignedMessageHash(keccak256(abi.encode(block.chainid, address(escrow), id, recipient)));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(key, digest);
        return abi.encodePacked(r,s,v);
    }
    function test_claimAllAssetsAndRejectReplay() public {
        uint256 id = deposit(); address recipient = address(0x456);
        bytes memory sig = signature(id, recipient, signerKey);
        escrow.claim(id, recipient, sig);
        assertEq(a.balanceOf(recipient), 2 ether); assertEq(b.balanceOf(recipient), 3 ether);
        vm.expectRevert(SpectrumEscrow.Unavailable.selector); escrow.claim(id, recipient, sig);
    }
    function test_cancelRefundsSenderRatherThanRouter() public {
        uint256 id = deposit();
        vm.expectRevert(SpectrumEscrow.Unauthorized.selector); escrow.cancel(id);
        vm.prank(sender); escrow.cancel(id);
        assertEq(a.balanceOf(sender), 2 ether); assertEq(b.balanceOf(sender), 3 ether);
    }
    function test_badSignatureCannotReleaseAssets() public {
        uint256 id = deposit(); address recipient = address(0x456);
        bytes memory sig = signature(id, recipient, 88);
        vm.expectRevert(SpectrumEscrow.Unauthorized.selector); escrow.claim(id, recipient, sig);
        assertEq(a.balanceOf(address(escrow)), 2 ether);
    }
    function test_failedLegRollsBackEntireDeposit() public {
        b.setTransferFromResult(false);
        vm.expectRevert(); deposit();
        assertEq(a.balanceOf(address(escrow)), 0); assertEq(a.balanceOf(address(this)), 100 ether);
    }
    function test_duplicateTokensRejected() public {
        address[] memory tokens = new address[](2); tokens[0] = address(a); tokens[1] = address(a);
        uint256[] memory amounts = new uint256[](2); amounts[0] = 1; amounts[1] = 1;
        vm.expectRevert(SpectrumEscrow.InvalidBundle.selector);
        escrow.depositBundle(sender, vm.addr(signerKey), tokens, amounts, bytes32(0));
    }
    function test_signatureBoundToChainAndRecipient() public {
        uint256 id = deposit(); address recipient = address(0x456);
        bytes memory sig = signature(id, recipient, signerKey);
        vm.expectRevert(SpectrumEscrow.Unauthorized.selector); escrow.claim(id, address(0x789), sig);
        vm.chainId(block.chainid + 1);
        vm.expectRevert(SpectrumEscrow.Unauthorized.selector); escrow.claim(id, recipient, sig);
    }
}
