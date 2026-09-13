// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import {Script} from "forge-std/Script.sol";
import {SpectrumEscrow} from "../src/SpectrumEscrow.sol";

contract DeploySpectrum is Script {
    function run() external returns (SpectrumEscrow escrow) {
        vm.startBroadcast();
        escrow = new SpectrumEscrow();
        vm.stopBroadcast();
    }
}
