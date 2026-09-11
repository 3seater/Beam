# Implementation Plan: Beam

## Overview

Beam is a Web3 "send-by-link" application on Robinhood Chain. The implementation covers four cooperating layers: a Solidity escrow contract (Foundry), a typed TypeScript library layer, a Next.js 14 App Router frontend (sender + recipient flows), and a lightweight Relayer API. Tasks are ordered so each step builds on verified prior work. Smart contract and Foundry tests are written first, then the lib/ layer, then providers and hooks, then UI components, and finally the full page compositions.

---

## Tasks

### 1. Project scaffolding

- [x] 1.1 Initialise Next.js 14 App Router project with TypeScript strict mode
  - Run `create-next-app` with `--ts --app --tailwind --eslint` flags
  - Set `"strict": true` in `tsconfig.json`
  - Confirm `next.config.ts` exists and `appDir` is enabled by default in Next 14
  - _Requirements: 13.1, 13.2_

- [x] 1.2 Install and pin all production dependencies
  - Add exact versions: `viem@^2`, `wagmi@^2`, `@privy-io/react-auth`, `@privy-io/wagmi`, `@tanstack/react-query`, `framer-motion`, `lucide-react`
  - Add dev dependencies: `foundry` (via `foundryup`), `fast-check`, `vitest`, `@testing-library/react`, `@vitejs/plugin-react`
  - Confirm no other web3 or animation library is introduced
  - _Requirements: 13.3, 13.4, 13.6, 13.7_

- [x] 1.3 Initialise Foundry workspace for smart contract development
  - Run `forge init contracts/` — this creates `contracts/src/`, `contracts/test/`, `contracts/script/`, and `foundry.toml`
  - Add `[fuzz] runs = 256` to `foundry.toml`
  - Install OpenZeppelin contracts v5 via `forge install OpenZeppelin/openzeppelin-contracts`
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 1.4 Configure Vitest for TypeScript property and unit tests
  - Create `vitest.config.ts` at the project root pointing to `src` and `lib` directories
  - Ensure `fast-check` and `@testing-library/react` resolve correctly
  - _Requirements: 13.1_

- [x] 1.5 Create `.env.local.example` and environment variable guard
  - List `NEXT_PUBLIC_PRIVY_APP_ID`, `NEXT_PUBLIC_RPC_URL`, `NEXT_PUBLIC_BEAM_ESCROW_ADDRESS`, `RELAYER_PRIVATE_KEY`
  - Document that `RELAYER_PRIVATE_KEY` must never be prefixed with `NEXT_PUBLIC_`
  - _Requirements: 13.3, 13.8_

- [x] 1.6 Checkpoint — project structure compiles and Vitest runs with zero tests
  - Run `npx tsc --noEmit` and `npx vitest --run` — both must exit 0
  - Run `forge build` inside `contracts/` — must compile with no errors
  - Ensure all tests pass; ask the user if questions arise.

---

### 2. Smart contract — BeamEscrow.sol

- [x] 2.1 Implement `BeamEscrow.sol` with storage, events, and custom errors
  - Create `contracts/src/BeamEscrow.sol` at Solidity 0.8.20
  - Import OpenZeppelin `ECDSA`, `MessageHashUtils`, `ReentrancyGuard`
  - Define `Deposit` struct, `mapping(uint256 => Deposit) private deposits`, `uint256 private depositCounter`
  - Declare `Deposited`, `Claimed`, `Cancelled` events with indexed fields exactly as specified in the design ABI
  - Declare all nine custom errors: `ZeroValue`, `ZeroAddress`, `ZeroAmount`, `DepositDoesNotExist`, `AlreadyClaimed`, `NotSender`, `InvalidSignature`, `TokenTransferFailed`, `ETHTransferFailed`
  - _Requirements: 1.1–1.5, 2.1–2.8, 3.1–3.10, 4.1–4.8, 5.1–5.6_

- [x] 2.2 Implement `depositNative` function
  - Guard: revert `ZeroValue` if `msg.value == 0`; revert `ZeroAddress("claimSignerAddress")` if signer is zero
  - Increment `depositCounter` and write the full `Deposit` struct to storage
  - Emit `Deposited` event
  - Return `depositId`
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 2.3 Implement `depositToken` function
  - Guard: revert `ZeroAmount` if `amount == 0`; revert `ZeroAddress` for either zero-address argument
  - Increment counter and record struct (Checks-Effects before the external call per CEI pattern)
  - Call `transferFrom` via low-level call; decode return data; revert `TokenTransferFailed` on failure
  - Emit `Deposited` event; return `depositId`
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_

- [x] 2.4 Implement `claim` function with CEI pattern and `nonReentrant`
  - Checks: existence (`amount == 0 && !claimed`), `AlreadyClaimed`, zero `recipientAddress`, signature recovery via `MessageHashUtils.toEthSignedMessageHash` + `ECDSA.recover`
  - Effects: set `dep.claimed = true`, cache `token` and `amount` into locals
  - Interactions: native ETH low-level call OR ERC-20 `transfer`; revert on failure
  - Emit `Claimed` event
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 5.1, 5.2, 5.4, 5.5, 5.6_

- [x] 2.5 Implement `cancel` function with CEI pattern and `nonReentrant`
  - Checks: existence, `AlreadyClaimed`, `NotSender`
  - Effects: `dep.claimed = true`, cache `token`, `amount`, `sender`
  - Interactions: ETH or ERC-20 refund; revert on failure
  - Emit `Cancelled` event
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 5.2, 5.4_

- [x] 2.6 Implement `getDeposit` view function
  - Returns full `Deposit memory` for a given `depositId`
  - _Requirements: 8.2_

- [x] 2.7 Checkpoint — contract compiles and basic smoke tests pass
  - Run `forge build` — must compile with 0 errors and 0 warnings
  - Write a single Foundry unit test (in `contracts/test/BeamEscrow.t.sol`) that deposits native ETH and reads back the struct to confirm fields
  - Run `forge test` — must pass
  - Ensure all tests pass; ask the user if questions arise.

---

### 3. Foundry unit tests

- [x] 3.1 Write `depositNative` happy path and revert unit tests
  - Happy path: verify returned `depositId == 1`, stored struct fields match inputs, `Deposited` event emitted
  - Revert cases: `msg.value == 0` → `ZeroValue`, zero signer → `ZeroAddress`
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 3.2 Write `depositToken` happy path and revert unit tests
  - Use a mock ERC-20 (`MockERC20`) that implements `transfer`/`transferFrom` and returns `bool`
  - Happy path: correct struct, `Deposited` event, `depositId` increments
  - Revert cases: zero amount, zero token address, zero signer address, `transferFrom` returns false
  - _Requirements: 2.1–2.8_

- [x] 3.3 Write `claim` happy path and revert unit tests
  - Happy path (native ETH): deposit → claim → verify recipient balance increased, `dep.claimed == true`, `Claimed` event
  - Happy path (ERC-20): same sequence with mock token
  - Revert cases: already claimed, invalid signature (random bytes), zero recipient, non-existent deposit
  - _Requirements: 3.1–3.10_

- [x] 3.4 Write `cancel` happy path and revert unit tests
  - Happy path (native ETH and ERC-20): verify sender balance restored, `dep.claimed == true`, `Cancelled` event
  - Revert cases: wrong caller, already claimed deposit, non-existent deposit
  - _Requirements: 4.1–4.8_

- [x] 3.5 Write reentrancy attack unit test
  - Create `ReentrantAttacker.sol` mock that calls `claim` again from within a `receive()` or `fallback()` callback
  - Assert the second call reverts due to `nonReentrant` guard
  - _Requirements: 3.10, 4.8, 5.2_

---

### 4. Foundry property-based fuzz tests (Properties 2–9)

- [x] 4.1 Property 2 — Deposit creation stores exact fields (native ETH)
  - Fuzz inputs: `address signer`, `uint256 value`; constrain `value > 0`, `signer != address(0)`
  - Assert stored struct fields match inputs exactly and `Deposited` event has matching fields
  - Tag: `// Feature: beam, Property 2: Deposit creation stores exact fields (native ETH)`
  - _Requirements: 1.1, 1.5_

- [x] 4.1a Write fuzz test for Property 2 using Foundry `testFuzz_depositNative_storesExactFields`
  - _Requirements: 1.1, 1.5_

- [x] 4.2 Property 3 — Deposit creation stores exact fields (ERC-20)
  - Fuzz: `address token`, `uint256 amount`, `address signer`; constrain non-zero values, use `MockERC20`
  - Assert all struct fields match inputs, `Deposited` event emitted
  - Tag: `// Feature: beam, Property 3: Deposit creation stores exact fields (ERC-20)`
  - _Requirements: 2.1, 2.2, 2.6_

- [x] 4.2a Write fuzz test for Property 3 using Foundry `testFuzz_depositToken_storesExactFields`
  - _Requirements: 2.1, 2.2, 2.6_

- [x] 4.3 Property 4 — DepositId is monotonically increasing with no gaps
  - Fuzz: number of deposits N (1–50); perform N deposits; collect returned IDs
  - Assert IDs form the sequence 1, 2, …, N with no duplicates or gaps
  - Tag: `// Feature: beam, Property 4: DepositId is monotonically increasing with no gaps`
  - _Requirements: 1.2, 2.3_

- [x] 4.3a Write fuzz test for Property 4 using Foundry `testFuzz_depositCounter_monotonic`
  - _Requirements: 1.2, 2.3_

- [x] 4.4 Property 5 — Claim with valid signature marks deposit claimed and transfers exact amount
  - Fuzz: `uint256 privKey`, `address recipient`, `uint256 amount`; derive `claimSigner` from `privKey`; build and sign `ClaimPayload` off-chain; call `claim`
  - Assert `dep.claimed == true`, recipient balance delta == `dep.amount`, `Claimed` event fields match
  - Tag: `// Feature: beam, Property 5: Claim with valid signature marks deposit claimed and transfers exact amount`
  - _Requirements: 3.1, 3.2, 3.3, 3.9_

- [x] 4.4a Write fuzz test for Property 5 using Foundry `testFuzz_claim_validSignature`
  - _Requirements: 3.1, 3.2, 3.3, 3.9_

- [x] 4.5 Property 6 — Cancel returns exact amount to original sender
  - Fuzz: `address sender`, `uint256 amount`, `address token`; snapshot sender balance before and after `cancel`
  - Assert balance delta == `dep.amount`, `dep.claimed == true`, `Cancelled` event emitted
  - Tag: `// Feature: beam, Property 6: Cancel returns exact amount to original sender`
  - _Requirements: 4.1, 4.2, 4.3, 4.7_

- [x] 4.5a Write fuzz test for Property 6 using Foundry `testFuzz_cancel_returnsExactAmount`
  - _Requirements: 4.1, 4.2, 4.3, 4.7_

- [x] 4.6 Property 7 — Invalid inputs to deposit functions always revert
  - Fuzz: call `depositNative` with `msg.value == 0` and any signer; call with valid value but `signer == address(0)`; call `depositToken` with `amount == 0`; call with zero `tokenAddress`; call with zero `claimSignerAddress`
  - Assert revert each time and `depositCounter` unchanged
  - Tag: `// Feature: beam, Property 7: Invalid inputs to deposit functions always revert`
  - _Requirements: 1.3, 1.4, 2.4, 2.5_

- [x] 4.6a Write fuzz test for Property 7 using Foundry `testFuzz_deposit_invalidInputsRevert`
  - _Requirements: 1.3, 1.4, 2.4, 2.5_

- [x] 4.7 Property 8 — Claim with invalid signature always reverts
  - Fuzz: `bytes signature` (any random bytes); use a valid unclaimed deposit
  - Assert revert with `InvalidSignature` and `dep.claimed` remains `false`
  - Tag: `// Feature: beam, Property 8: Claim with invalid signature always reverts`
  - _Requirements: 3.5, 5.6_

- [x] 4.7a Write fuzz test for Property 8 using Foundry `testFuzz_claim_invalidSignatureReverts`
  - _Requirements: 3.5, 5.6_

- [x] 4.8 Property 9 — Claimed/cancelled deposits are permanently closed
  - Sequence: deposit → claim (or cancel) → attempt second claim → assert revert `AlreadyClaimed`; attempt cancel after claim → assert revert `AlreadyClaimed`
  - Tag: `// Feature: beam, Property 9: Claimed/cancelled deposits are permanently closed`
  - _Requirements: 3.4, 4.5, 5.5_

- [x] 4.8a Write fuzz test for Property 9 using Foundry `testFuzz_deposit_terminalStateImmutable`
  - _Requirements: 3.4, 4.5, 5.5_

- [x] 4.9 Checkpoint — all Foundry tests pass
  - Run `forge test -vv` — all unit and fuzz tests must pass with 0 failures
  - Ensure all tests pass; ask the user if questions arise.

---

### 5. TypeScript lib/ layer

- [x] 5.1 Create `lib/types.ts` — shared TypeScript interfaces
  - Export `Deposit`, `BeamLinkParams`, `ClaimPayload`, `RelayClaimRequest`, `RelayClaimResponse`, `BeamStep` exactly as specified in the design data models
  - _Requirements: 13.1, 13.4_

- [x] 5.2 Create `lib/chains.ts` — RobinhoodChain viem definition
  - Define `robinhoodChain` using `defineChain` with `id: 4663`, RPC URL from `NEXT_PUBLIC_RPC_URL` env var with fallback, Blockscout block explorer
  - _Requirements: 13.5_

- [x] 5.3 Create `lib/constants.ts` — contract address and other constants
  - Export `BEAM_ESCROW_ADDRESS` read from `NEXT_PUBLIC_BEAM_ESCROW_ADDRESS` env var
  - Export `DEPOSIT_TIMEOUT_MS = 60_000`, `WALLET_PROVISION_TIMEOUT_MS = 30_000`, `DEPOSIT_QUERY_TIMEOUT_MS = 15_000`
  - _Requirements: 7.4, 8.2, 9.2_

- [x] 5.4 Create `lib/escrow-abi.ts` — minimal ABI fragments
  - Export `BEAM_ESCROW_ABI` as a const array with `depositNative`, `depositToken`, `getDeposit`, `cancel`, and the three events exactly as shown in the design ABI fragments section
  - _Requirements: 13.4_

- [x] 5.5 Create `lib/wagmi-config.ts` — wagmi + Privy configuration
  - `createConfig` with `chains: [robinhoodChain]` and `toPrivyWagmiAdapter()` connector
  - Export `wagmiConfig`
  - _Requirements: 13.4, 13.5_

- [x] 5.6 Create `lib/beam-link.ts` — BeamLink encode, parse, and ephemeral key generation
  - `generateEphemeralKey()` using viem's `generatePrivateKey` and `privateKeyToAddress`
  - `constructBeamLink(origin, ephemeralPrivKey, depositId)` — zero-pad key to 64 chars, serialize `depositId` as base-10 decimal
  - `parseBeamLink(hash)` — validate with `VALID_KEY_RE` and `VALID_ID_RE`, throw descriptive errors on invalid input
  - _Requirements: 6.1, 6.2, 6.3, 14.1, 14.2, 14.3_

- [x] 5.7 Create `lib/eip191.ts` — ClaimPayload signing
  - `signClaimPayload(ephemeralPrivKey, recipientAddress, depositId)` using viem `keccak256`, `encodePacked`, `privateKeyToAccount`, and `signMessage` with `{ raw: toBytes(msgHash) }`
  - _Requirements: 9.3_

- [x] 5.8 Create `lib/format.ts` — address truncation and token amount formatting
  - `truncateAddress(address)` → `${first6}...${last4}`
  - `formatTokenAmount(amount, decimals)` — divide, `toFixed(decimals)`, strip trailing zeros
  - _Requirements: 8.3_

- [x] 5.9 Create `lib/escrow.ts` — contract read helpers
  - `fetchDeposit(depositId, publicClient)` — calls `getDeposit`, times out at `DEPOSIT_QUERY_TIMEOUT_MS`, returns typed `Deposit`
  - _Requirements: 8.2, 8.7_

- [x] 5.10 Checkpoint — lib/ layer compiles with no TypeScript errors
  - Run `npx tsc --noEmit`; ensure 0 errors
  - Ensure all tests pass; ask the user if questions arise.

---

### 6. TypeScript property-based tests (Properties 1, 10, 11, 12)

- [x] 6.1 Property 1 — BeamLink encode/parse round-trip
  - Use `fc.uint8Array({ minLength: 32, maxLength: 32 })` for keys and `fc.bigInt({ min: 0n })` for IDs
  - Assert `parseBeamLink(constructBeamLink(origin, key, id))` recovers original key and ID
  - `numRuns: 100`; tag: `// Feature: beam, Property 1: BeamLink encode/parse round-trip`
  - _Requirements: 14.1, 14.2, 14.4_

- [x] 6.1a Write Vitest + fast-check test for Property 1 in `lib/__tests__/beam-link.test.ts`
  - _Requirements: 14.1, 14.2, 14.4_

- [x] 6.2 Property 10 — EIP-191 signing round-trip
  - Use `fc.hexaString({ minLength: 64, maxLength: 64 })` for private keys, `fc.bigInt({ min: 0n })` for IDs, `fc.ethereumAddress()` for recipients
  - Sign payload, recover signer via `publicKeyToAddress(recoverPublicKey(...))`, assert equality with `privateKeyToAddress(privKey)`
  - `numRuns: 100`; tag: `// Feature: beam, Property 10: EIP-191 signing round-trip`
  - _Requirements: 9.3_

- [x] 6.2a Write Vitest + fast-check test for Property 10 in `lib/__tests__/eip191.test.ts`
  - _Requirements: 9.3_

- [x] 6.3 Property 11 — Share URLs contain the full BeamLink
  - Use `fc.webUrl()` combined with generated `key`/`id` pairs
  - For each of the three share schemes (iMessage `sms:`, Twitter `https://twitter.com/intent/tweet`, WhatsApp `https://wa.me/`), assert the full BeamLink URL appears URL-encoded in the message body param
  - `numRuns: 100`; tag: `// Feature: beam, Property 11: Share URLs contain the full BeamLink`
  - _Requirements: 6.5_

- [x] 6.3a Write Vitest + fast-check test for Property 11 in `components/__tests__/BeamLinkDisplay.test.ts`
  - _Requirements: 6.5_

- [x] 6.4 Property 12 — Sender address truncation format
  - Use `fc.hexaString({ minLength: 40, maxLength: 40 })` prepended with `0x`
  - Assert output matches `{first6chars}...{last4chars}`, verify length is exactly 13 chars
  - `numRuns: 100`; tag: `// Feature: beam, Property 12: Sender address truncation format`
  - _Requirements: 8.3_

- [x] 6.4a Write Vitest + fast-check test for Property 12 in `lib/__tests__/format.test.ts`
  - _Requirements: 8.3_

- [x] 6.5 Checkpoint — all Vitest property tests pass
  - Run `npx vitest --run` — all 4 property tests must pass
  - Ensure all tests pass; ask the user if questions arise.

---

### 7. Providers and App Router root layout

- [x] 7.1 Create `components/providers/PrivyProviderWrapper.tsx`
  - `'use client'` directive
  - Read `NEXT_PUBLIC_PRIVY_APP_ID`; throw with descriptive message if missing or empty at module init time
  - Configure `loginMethods: ['apple', 'google', 'twitter']`, `embeddedWallets: { createOnLogin: 'users-without-wallets' }`, `defaultChain` and `supportedChains` to Robinhood Chain id 4663
  - Wrap children in `PrivyProvider` → `QueryClientProvider` → `WagmiProvider` (from `@privy-io/wagmi`) nesting order
  - _Requirements: 13.3, 13.8, 9.1_

- [x] 7.2 Create `app/layout.tsx` — root App Router layout
  - Import and use the `Providers` component from `PrivyProviderWrapper`
  - Apply `#070709` background and global Geist Sans / Inter Display font via `next/font` or CSS custom property
  - Include global CSS that sets grid overlay and radial gradient background on `body`
  - _Requirements: 12.1, 12.2, 12.4, 13.1_

- [x] 7.3 Create global CSS design tokens in `app/globals.css`
  - CSS variable `--bg-primary: #070709`
  - Grid overlay: pseudo-element with `repeating-linear-gradient` lines ≤ 40px spacing, ≤ 10% opacity
  - Radial gradient: blue/purple hues ≤ 20% opacity on page background
  - Glassmorphism surface class: `.glass` — semi-transparent dark bg ≤ 60% opacity, `backdrop-filter: blur(8px)`, 1px white border ≤ 15% opacity
  - Primary button gradient (periwinkle → blue) with pill shape (`border-radius: 999px`) and glow shadow on hover/focus
  - _Requirements: 12.1, 12.2, 12.3, 12.5, 12.7_

---

### 8. UI primitives

- [x] 8.1 Create `components/ui/Button.tsx`
  - Variants: `primary` (pill gradient glow per design system), `secondary`, `ghost`
  - Accessible: `aria-label` prop, focus ring, keyboard activation
  - Use Tailwind utilities exclusively; no inline style for Tailwind-expressible properties
  - _Requirements: 12.5, 13.2, 11.4_

- [x] 8.2 Create `components/ui/Modal.tsx`
  - Framer Motion entrance/exit animation (scale + fade)
  - `aria-modal`, `role="dialog"`, focus trap, Escape key close handler
  - Glassmorphism surface styling via `.glass` class
  - _Requirements: 12.3, 13.7, 10.5, 10.6_

- [x] 8.3 Create `components/ui/Badge.tsx`
  - Displays chain name ("Robinhood Chain") and gasless status ("Gasless")
  - Rendered on all transaction-initiating surfaces; remains visible for full session
  - _Requirements: 12.6_

- [x] 8.4 Create `components/ui/Accordion.tsx`
  - Controlled open/close with Framer Motion height animation
  - `aria-expanded`, `aria-controls`, keyboard activation (Enter / Space)
  - Items collapsed by default
  - _Requirements: 11.3_

---

### 9. Core hooks

- [x] 9.1 Create `hooks/useBeamEscrow.ts` — typed contract read/write hooks
  - `useGetDeposit(depositId)` wrapping `useReadContract` with `enabled` guard
  - `useDepositNative()` — returns `deposit(claimSignerAddress, value)` function, `hash`, `receipt`
  - `useDepositToken()` — returns `deposit(tokenAddress, amount, claimSignerAddress)` function, `hash`, `receipt`
  - _Requirements: 13.4_

- [x] 9.2 Create `hooks/useDeposit.ts` — send flow orchestration hook
  - State machine covering all `BeamStep` values: `idle` → `approval-pending` → `approval-confirming` → `deposit-pending` → `deposit-confirming` → `link-generated`
  - Check ERC-20 allowance before deposit; set approval step only when needed
  - Generate `ephemeralKey` via `generateEphemeralKey()` immediately before submitting the deposit tx
  - On deposit confirmation, call `constructBeamLink` and transition to `link-generated`
  - On tx failure or 60s timeout: discard key, show error, reset to `idle`
  - _Requirements: 6.1, 6.2, 6.6, 7.3, 7.5_

- [x] 9.3 Create `hooks/useClaim.ts` — claim flow orchestration hook
  - Export `waitForEmbeddedWallet(privy)` polling function with 30s deadline
  - On "Claim" click: `privy.login()` → wait for embedded wallet → `signClaimPayload` → `POST /api/relay/claim` → poll for confirmation
  - Handle already-claimed pre-check, relayer errors, and on-chain revert with retry capability without re-authentication
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7_

- [x] 9.4 Checkpoint — hooks compile; spot-check with `npx tsc --noEmit`
  - Ensure all tests pass; ask the user if questions arise.

---

### 10. CreateBeamModal and sub-components

- [x] 10.1 Create `components/CreateBeamModal.tsx` — multi-step send flow shell
  - Import and compose `AssetSelector`, `AmountInput`, `FeeEstimate`, `StepIndicator`, `BeamLinkDisplay`
  - Use `useDeposit` hook for state machine; pass `BeamStep` down to `StepIndicator`
  - Render inside `Modal.tsx`; include `Badge` for chain/gasless micro-badges
  - _Requirements: 7.5, 12.6_

- [x] 10.2 Create `components/CreateBeamModal/AssetSelector.tsx`
  - Dropdown listing native ETH plus all ERC-20 tokens in the Sender's wallet on RobinhoodChain
  - Uses wagmi `useBalance` and token balance reads
  - _Requirements: 7.1_

- [x] 10.3 Create `components/CreateBeamModal/AmountInput.tsx`
  - Numeric input accepting 0.000001 to 999,999,999 with up to 6 decimal places
  - Validation: zero or non-numeric → show error and disable confirm button
  - Insufficient balance (asset or gas) → show insufficient balance error and disable confirm button
  - _Requirements: 7.1, 7.4, 7.7_

- [x] 10.4 Create `components/CreateBeamModal/FeeEstimate.tsx`
  - Display estimated gas fee in ETH, updated within 3 seconds of last input change
  - On estimation failure: show "Fee estimation unavailable" and disable confirm button
  - _Requirements: 7.2, 7.6_

- [x] 10.5 Create `components/CreateBeamModal/StepIndicator.tsx`
  - Render the five ordered states: approval-pending → approval-confirming → deposit-pending → deposit-confirming → link-generated
  - Show approval steps only when an ERC-20 approval is required
  - Active state becomes active only after preceding state completes
  - _Requirements: 7.5_

- [x] 10.6 Create `components/CreateBeamModal/BeamLinkDisplay.tsx`
  - Displays the BeamLink after `link-generated` state
  - One-click copy to clipboard with confirmation indicator within 1 second
  - Three share buttons using deep-link schemes: iMessage (`sms:?body=`), X/Twitter (`https://twitter.com/intent/tweet?text=`), WhatsApp (`https://wa.me/?text=`)
  - Each share URL encodes the full BeamLink as the message body
  - Key stored exclusively in hash fragment; never transmitted to server
  - _Requirements: 6.3, 6.4, 6.5_

---

### 11. Relayer API route

- [x] 11.1 Create `app/api/relay/claim/route.ts` — Next.js App Router API route
  - `POST` handler reading `{ depositId, recipientAddress, signature }` from JSON body
  - Input validation: `depositId` is valid base-10 decimal string, `recipientAddress` passes checksum, `signature` is 65-byte hex
  - Call `getDeposit(depositId)` via viem public client; return `409` with `{ error, code: "ALREADY_CLAIMED" }` if `claimed == true`
  - Dry-run `claim()` via `eth_call`; return `400` with `{ error, code: "INVALID_SIG" }` if it reverts
  - Submit `claim(depositId, recipientAddress, signature)` with gas estimate × 1.2 using the relayer EOA wallet (private key from `RELAYER_PRIVATE_KEY`)
  - Return `{ txHash, status: "submitted" }` on success
  - Rate-limit per IP: max 5 relay requests per minute (use in-memory counter for single-instance deployments)
  - _Requirements: 9.4, 9.5, 9.7_

- [x] 11.2 Create `app/api/relay/health/route.ts` — health check endpoint
  - `GET` handler returning `{ status: "ok" }` with 200
  - _Requirements: 13.1_

---

### 12. Claim page components

- [x] 12.1 Create `app/claim/page.tsx` — ClaimPage client component
  - Parse hash fragment client-side with `parseBeamLink(window.location.hash)` on mount
  - On parse error: display invalid link error; do not query contract
  - Call `fetchDeposit(depositId)` with 15s timeout; on timeout or error show retry button
  - Display `DepositCard` once metadata loaded; if `claimed == true` show "already used" message and hide claim button
  - Do not log or transmit raw `ephemeralPrivKey`
  - _Requirements: 8.1, 8.2, 8.4, 8.5, 8.6, 8.7_

- [x] 12.2 Create `app/claim/DepositCard.tsx`
  - Show: sender address via `truncateAddress`, token symbol, amount via `formatTokenAmount`, network name ("Robinhood Chain")
  - Glassmorphism surface styling
  - _Requirements: 8.3, 12.3_

- [x] 12.3 Create `app/claim/ClaimButton.tsx`
  - Triggers `useClaim` hook on click
  - Shows pending state ("Transaction processing…") while awaiting on-chain confirmation
  - Displays error message and retry action on failure without requiring re-authentication
  - _Requirements: 9.4, 9.6, 9.7_

- [x] 12.4 Create `app/claim/ClaimSuccess.tsx` — success state with confetti
  - Framer Motion entrance animation
  - Confetti animation (particle burst) on mount
  - Display claimed amount and recipient address
  - _Requirements: 9.6, 13.7_

---

### 13. Landing page components

- [x] 13.1 Create `components/Navbar.tsx`
  - Beam logo, navigation links, "Connect & Send" button
  - "Connect & Send" opens `CreateBeamModal` within 300ms of click
  - _Requirements: 10.2, 10.6_

- [x] 13.2 Create `components/HeroSection.tsx` with `StatsStrip` and `BeamPreviewCard`
  - Full-width hero with gradient-styled headline (word "beam" gradient-styled), sub-hook copy ≤ 160 characters
  - Primary "Send a Beam" CTA opens `CreateBeamModal` within 300ms
  - "How it works" anchor link scrolls to the section
  - _Requirements: 10.1, 10.5_

- [x] 13.3 Create `components/StatsStrip.tsx`
  - Three quantitative metrics: total beams sent, total value transferred, supported tokens
  - On load failure: display "—" placeholder for each unavailable metric without hiding the strip
  - _Requirements: 10.3, 10.7_

- [x] 13.4 Create `components/BeamPreviewCard.tsx`
  - Floating sample BeamLink claim card
  - Token amount ≤ 12 characters; at least one social share indicator visible
  - _Requirements: 10.4_

- [x] 13.5 Create `components/HowItWorksSection.tsx`
  - Exactly three cards in order: "Deposit", "Share", "Claim"
  - Each card: title + description of at least one sentence
  - _Requirements: 11.1_

- [x] 13.6 Create `components/WhyBeamSection.tsx`
  - Feature matrix: 2 columns × 3 rows (6 cells)
  - Cells cover: no wallet required, gasless claims, any chat app, ERC-20 + ETH, instant social login, cryptographic security
  - _Requirements: 11.2_

- [x] 13.7 Create `components/FAQSection.tsx`
  - At least five Q&A pairs using `Accordion.tsx`
  - Topics: link security, recipient experience, supported tokens, cancellation, gas fees
  - Each answer collapsed by default; expands on activation
  - _Requirements: 11.3_

- [x] 13.8 Create `components/BottomCTA.tsx`
  - Headline ≤ 20 words + "Send a Beam" button
  - Button opens `CreateBeamModal`; keyboard-reachable with accessible label
  - _Requirements: 11.4, 11.5_

- [x] 13.9 Create `app/page.tsx` — LandingPage composition
  - Import and compose: `Navbar`, `HeroSection`, `HowItWorksSection`, `WhyBeamSection`, `FAQSection`, `BottomCTA`
  - Manage `isModalOpen` state; pass open/close handlers to `CreateBeamModal`
  - _Requirements: 10.1–10.7, 11.1–11.5_

---

### 14. Visual design system — final pass

- [x] 14.1 Apply glassmorphism surface class to all elevated containers
  - Audit `CreateBeamModal`, `DepositCard`, `BeamPreviewCard`, FAQ cards, How-It-Works cards, Why-Beam cells
  - Confirm semi-transparent dark bg ≤ 60% opacity, `backdrop-filter: blur(8px)` ≥ 8px, 1px white border ≤ 15% opacity on all surfaces
  - _Requirements: 12.3_

- [x] 14.2 Apply primary button styles across all CTA surfaces
  - "Send a Beam", "Connect & Send", "Claim to Wallet", "Send a Beam" (BottomCTA) must all use the `primary` variant from `Button.tsx`
  - Confirm pill shape, gradient, glow on hover/focus
  - _Requirements: 12.5_

- [x] 14.3 Apply Geist Sans / Inter Display typeface with fallback
  - Configure font via `next/font/google` or `next/font/local`
  - Fallback chain: `Geist Sans, Inter Display, system-ui, sans-serif`
  - Validate CLS ≤ 0.1 does not regress (no layout shifts on font swap)
  - _Requirements: 12.4, 12.8_

- [x] 14.4 Verify dark-mode only — no light-mode toggle
  - Confirm no `prefers-color-scheme: light` media query branches that would change the colour scheme
  - Confirm no light-mode toggle component exists
  - _Requirements: 12.7_

---

### 15. Integration wiring and final checkpoint

- [x] 15.1 Wire `CreateBeamModal` into `Navbar` and `LandingPage`
  - Single shared `isModalOpen` state lifted to `app/page.tsx`
  - Both "Send a Beam" (hero) and "Connect & Send" (navbar) open the same modal instance
  - Confirm modal opens within 300ms of click (no lazy-import waterfall that delays it)
  - _Requirements: 10.5, 10.6_

- [x] 15.2 Wire `useClaim` into `ClaimPage` end-to-end
  - Confirm `signClaimPayload` uses `ephemeralPrivKey` from parsed hash fragment
  - Confirm `POST /api/relay/claim` is called with correctly typed `RelayClaimRequest`
  - Confirm success navigates to `ClaimSuccess`, failure shows error with retry
  - _Requirements: 9.3, 9.4, 9.6, 9.7_

- [x] 15.3 Final checkpoint — full project build and all tests pass
  - Run `npx tsc --noEmit` — 0 errors
  - Run `npx vitest --run` — all property tests pass
  - Run `forge test -vv` inside `contracts/` — all unit and fuzz tests pass
  - Run `next build` — production build succeeds with 0 errors
  - Ensure all tests pass; ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP build
- Each task references specific requirements for full traceability
- Foundry fuzz tests use `runs = 256`; fast-check property tests use `numRuns: 100`
- The EphemeralKey must never appear outside the URL hash fragment — any code that logs, transmits, or persists it must be rejected in review
- `RELAYER_PRIVATE_KEY` must never be exposed client-side; the Relayer API route runs exclusively on the server
- The design document's CEI pattern must be preserved exactly in `claim` and `cancel` — do not reorder checks, effects, or interactions

---

## Task Dependency Graph

```json
{
  "waves": [
    {
      "id": 0,
      "tasks": ["1.1", "1.2", "1.3", "1.4", "1.5"]
    },
    {
      "id": 1,
      "tasks": ["2.1"]
    },
    {
      "id": 2,
      "tasks": ["2.2", "2.3", "2.6"]
    },
    {
      "id": 3,
      "tasks": ["2.4", "2.5"]
    },
    {
      "id": 4,
      "tasks": ["3.1", "3.2", "5.1", "5.2", "5.3", "5.4"]
    },
    {
      "id": 5,
      "tasks": ["3.3", "3.4", "3.5", "5.5", "5.6", "5.7", "5.8", "5.9"]
    },
    {
      "id": 6,
      "tasks": ["4.1", "4.1a", "4.2", "4.2a", "4.3", "4.3a", "4.6", "4.6a", "4.7", "4.7a", "4.8", "4.8a", "6.1", "6.1a", "6.2", "6.2a", "6.4", "6.4a"]
    },
    {
      "id": 7,
      "tasks": ["4.4", "4.4a", "4.5", "4.5a", "6.3", "6.3a", "7.1", "7.2", "7.3"]
    },
    {
      "id": 8,
      "tasks": ["8.1", "8.2", "8.3", "8.4", "9.1"]
    },
    {
      "id": 9,
      "tasks": ["9.2", "9.3", "11.1", "11.2"]
    },
    {
      "id": 10,
      "tasks": ["10.1", "10.2", "10.3", "10.4", "10.5", "10.6", "12.1", "13.1"]
    },
    {
      "id": 11,
      "tasks": ["12.2", "12.3", "12.4", "13.2", "13.3", "13.4", "13.5", "13.6", "13.7", "13.8"]
    },
    {
      "id": 12,
      "tasks": ["13.9", "14.1", "14.2", "14.3", "14.4"]
    },
    {
      "id": 13,
      "tasks": ["15.1", "15.2"]
    },
    {
      "id": 14,
      "tasks": ["15.3"]
    }
  ]
}
```
