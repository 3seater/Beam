# Foundry Dependencies

## OpenZeppelin Contracts v5

**Status:** Not yet installed — Foundry (`forge`) is not available in the current environment.

**To install when Foundry is available:**

```bash
# From the contracts/ directory:
forge install OpenZeppelin/openzeppelin-contracts --no-git
```

This will clone `OpenZeppelin/openzeppelin-contracts` into `contracts/lib/openzeppelin-contracts/`.

The `foundry.toml` remapping is already configured:

```toml
remappings = [
    "@openzeppelin/contracts/=lib/openzeppelin-contracts/contracts/",
]
```

So once installed, Solidity imports like the following will resolve correctly:

```solidity
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
```

## forge-std

**To install when Foundry is available:**

```bash
forge install foundry-rs/forge-std --no-git
```

This provides `Test`, `Script`, `console`, `vm`, and all standard test helpers used in `.t.sol` files.
