# Requirements Document

## Introduction

Beam ($BEAM) is a Web3 application that enables users to send native ETH and ERC-20 tokens on Robinhood Chain (EVM) as shareable links. A sender deposits funds into an on-chain escrow contract and receives a link containing an ephemeral private key in the URL hash fragment. The recipient opens the link, authenticates via Privy social login (Apple, Google, Twitter), receives a provisioned embedded smart wallet, and claims the funds gaslessly. Beam eliminates the need for recipients to have a pre-existing wallet or gas funds, lowering the barrier to Web3 participation.

## Glossary

- **Beam**: The Beam application and protocol ($BEAM)
- **BeamEscrow**: The deployed Solidity smart contract managing deposits and claims on Robinhood Chain
- **Deposit**: A recorded escrow entry in BeamEscrow containing sender, token, amount, claimSigner, claimed status, and createdAt timestamp
- **DepositId**: A unique uint256 identifier returned by BeamEscrow for each deposit
- **EphemeralKey**: A one-time use secp256k1 private key generated client-side in the browser using viem's generatePrivateKey()
- **ClaimSignerAddress**: The public address derived from the EphemeralKey, stored on-chain as the authorized claim signer
- **BeamLink**: A shareable URL of the form `{origin}/claim#key={ephemeralPrivateKey}&id={depositId}`
- **Sender**: An authenticated user who deposits ETH or ERC-20 tokens to create a BeamLink
- **Recipient**: Any person who receives a BeamLink and claims its contents
- **Relayer**: A backend service that submits claim transactions on behalf of Recipients, covering gas costs
- **Privy**: The embedded wallet and social authentication provider (@privy-io/react-auth)
- **EmbeddedWallet**: A smart contract wallet provisioned by Privy upon Recipient social authentication
- **RobinhoodChain**: The EVM-equivalent L2 blockchain where BeamEscrow is deployed
- **ClaimPayload**: The EIP-191 signed message: keccak256(abi.encodePacked(recipientAddress, depositId))
- **CreateBeamModal**: The UI component for configuring and initiating a deposit
- **ClaimPage**: The UI at /claim that Recipients use to authenticate and claim funds
- **LandingPage**: The marketing and entry-point page at /
- **GaslessClaim**: A claim transaction submitted by the Relayer so the Recipient pays no gas
- **ERC20Token**: Any ERC-20 compliant token contract, including stock-paired tokens on Robinhood Chain
- **StockPairedToken**: An ERC-20 token on Robinhood Chain representing a fractional share of a publicly traded stock

---

## Requirements

### Requirement 1: BeamEscrow — Native ETH Deposit

**User Story:** As a Sender, I want to deposit native ETH into the escrow contract, so that I can generate a BeamLink backed by on-chain funds.

#### Acceptance Criteria

1. WHEN a Sender calls `depositNative(claimSignerAddress)` with a non-zero ETH value, THE BeamEscrow SHALL create a new Deposit record containing: the caller's address as the sender, the zero address (`0x000...000`) as the token field indicating native ETH, `msg.value` as the amount, the provided `claimSignerAddress`, `claimed` set to `false`, and `createdAt` set to `block.timestamp`.
2. WHEN a Sender calls `depositNative(claimSignerAddress)` with a non-zero ETH value, THE BeamEscrow SHALL assign the next available uint256 DepositId by incrementing a global counter starting at 1, and SHALL return that DepositId to the caller.
3. IF a Sender calls `depositNative(claimSignerAddress)` with `msg.value` equal to zero, THEN THE BeamEscrow SHALL revert the transaction with an error indicating that a non-zero ETH value is required, leaving contract state unchanged.
4. IF a Sender calls `depositNative(claimSignerAddress)` with `claimSignerAddress` equal to the zero address (`0x000...000`), THEN THE BeamEscrow SHALL revert the transaction with an error indicating that a valid signer address is required, leaving contract state unchanged.
5. WHEN `depositNative` executes successfully, THE BeamEscrow SHALL emit a `Deposited` event containing the assigned DepositId, the sender address, the zero address as the token field, `msg.value` as the amount, and the provided `claimSignerAddress`.

### Requirement 2: BeamEscrow — ERC-20 Token Deposit

**User Story:** As a Sender, I want to deposit ERC-20 tokens (including StockPairedTokens) into the escrow contract, so that I can create a BeamLink for any supported token.

#### Acceptance Criteria

1. WHEN a Sender calls `depositToken(tokenAddress, amount, claimSignerAddress)` after approving BeamEscrow to spend at least `amount` of the ERC20Token, THE BeamEscrow SHALL transfer exactly `amount` tokens from the Sender to itself using ERC-20 `transferFrom`.
2. WHEN a Sender calls `depositToken(tokenAddress, amount, claimSignerAddress)` successfully, THE BeamEscrow SHALL create a new Deposit struct recording the sender address, the tokenAddress, the amount, the claimSignerAddress, `claimed = false`, and `createdAt = block.timestamp`.
3. WHEN a Sender calls `depositToken(tokenAddress, amount, claimSignerAddress)` successfully, THE BeamEscrow SHALL assign a unique monotonically increasing uint256 DepositId and return it to the caller.
4. WHEN a Sender calls `depositToken` with a zero amount, THE BeamEscrow SHALL revert the transaction with an error indicating that the deposit amount must be greater than zero.
5. WHEN a Sender calls `depositToken` with a zero address for `tokenAddress` or `claimSignerAddress`, THE BeamEscrow SHALL revert the transaction with an error indicating which address argument is invalid.
6. WHEN `depositToken` executes successfully, THE BeamEscrow SHALL emit a `Deposited` event containing the DepositId, sender address, tokenAddress, amount, and claimSignerAddress.
7. IF the ERC-20 `transferFrom` call on `tokenAddress` reverts or returns false, THEN THE BeamEscrow SHALL revert the transaction with an error indicating that the token transfer failed, and SHALL NOT create a Deposit struct or emit a `Deposited` event.
8. IF `tokenAddress` does not implement the ERC-20 `transferFrom` interface, THEN THE BeamEscrow SHALL revert the transaction with an error indicating that the token address is not a valid ERC-20 contract.

### Requirement 3: BeamEscrow — Claim

**User Story:** As a Recipient, I want to claim the funds locked in a Deposit using a valid signature, so that the tokens are transferred to my wallet address.

#### Acceptance Criteria

1. WHEN a caller invokes `claim(depositId, recipientAddress, signature)` with a valid EIP-191 signature over `keccak256(abi.encodePacked(recipientAddress, depositId))` produced by the EphemeralKey whose derived address matches the Deposit's `claimSignerAddress`, THE BeamEscrow SHALL mark the Deposit as `claimed = true`.
2. WHEN the Deposit's token field is the zero address, THE BeamEscrow SHALL transfer the Deposit amount as native ETH to the `recipientAddress`.
3. WHEN the Deposit's token field is a non-zero address, THE BeamEscrow SHALL transfer the Deposit amount using ERC-20 `transfer` to the `recipientAddress`.
4. WHEN a caller invokes `claim` on a Deposit whose `claimed` field is already `true`, THE BeamEscrow SHALL revert with an error indicating the Deposit has already been claimed.
5. IF the signature supplied to `claim` does not recover to the Deposit's `claimSignerAddress`, or the recovered address is the zero address, THEN THE BeamEscrow SHALL revert with an error indicating signature verification failure.
6. IF the `recipientAddress` supplied to `claim` is the zero address, THEN THE BeamEscrow SHALL revert with an error indicating an invalid recipient.
7. IF `claim` is invoked with a `depositId` for which no Deposit exists (i.e., the stored Deposit amount is zero and `claimed` is false), THEN THE BeamEscrow SHALL revert with an error indicating the Deposit does not exist.
8. IF a native ETH transfer or ERC-20 `transfer` call within `claim` fails or reverts, THEN THE BeamEscrow SHALL revert the entire transaction with an error indicating the transfer failure, leaving the Deposit state unchanged.
9. WHEN `claim` executes successfully, THE BeamEscrow SHALL emit a `Claimed` event containing the `depositId`, `recipientAddress`, `token` address, and transferred `amount`.
10. THE BeamEscrow `claim` function SHALL be protected by OpenZeppelin's ReentrancyGuard `nonReentrant` modifier.

### Requirement 4: BeamEscrow — Cancel

**User Story:** As a Sender, I want to cancel my unclaimed deposit and recover my funds, so that I can reclaim assets from links I no longer wish to share.

#### Acceptance Criteria

1. WHEN the original Sender calls `cancel(depositId)` on a Deposit whose `claimed` field is `false`, THE BeamEscrow SHALL set the Deposit's `claimed` field to `true` and transfer the full recorded `amount` back to the Sender's address before the function returns.
2. WHEN the Deposit's `token` field is the zero address, THE BeamEscrow SHALL refund the Deposit's recorded `amount` in native ETH to the Sender's address using a low-level call, and IF that ETH transfer fails, THEN THE BeamEscrow SHALL revert and restore the Deposit's `claimed` field to `false`.
3. WHEN the Deposit's `token` field is a non-zero address, THE BeamEscrow SHALL refund the Deposit's recorded `amount` to the Sender's address via ERC-20 `transfer` on that token contract, and IF the ERC-20 `transfer` returns `false` or reverts, THEN THE BeamEscrow SHALL revert and restore the Deposit's `claimed` field to `false`.
4. IF the caller's address does not equal the `sender` field of the Deposit identified by `depositId`, THEN THE BeamEscrow SHALL revert with an error message indicating the caller is not the original sender, and SHALL leave the Deposit state unchanged.
5. IF the `claimed` field of the Deposit identified by `depositId` is `true` at the time `cancel` is called, THEN THE BeamEscrow SHALL revert with an error message indicating the Deposit has already been claimed or cancelled, and SHALL leave the Deposit state unchanged.
6. IF `depositId` does not correspond to an existing Deposit, THEN THE BeamEscrow SHALL revert with an error message indicating the Deposit does not exist, and SHALL make no state changes.
7. WHEN `cancel` executes successfully, THE BeamEscrow SHALL emit a `Cancelled` event containing the `depositId` and the Sender's address as indexed fields, emitted after the refund transfer completes.
8. THE BeamEscrow `cancel` function SHALL be protected by OpenZeppelin's `ReentrancyGuard` `nonReentrant` modifier, applied before any state mutation or external call occurs.

### Requirement 5: BeamEscrow — Contract Standards & Security

**User Story:** As a protocol developer, I want the smart contract to follow established security standards, so that user funds are protected from common attack vectors.

#### Acceptance Criteria

1. THE BeamEscrow SHALL use OpenZeppelin ECDSA for signature verification in the `claim` function, rejecting any claim whose recovered signer address does not match the `claimSignerAddress` stored in the corresponding Deposit struct.
2. THE BeamEscrow SHALL use OpenZeppelin ReentrancyGuard on all state-changing external functions that transfer value, causing any reentrant call to those functions to revert.
3. THE BeamEscrow SHALL be written in Solidity 0.8.20 with default overflow and underflow checks enabled, causing any arithmetic overflow or underflow to revert.
4. THE BeamEscrow SHALL apply the Checks-Effects-Interactions pattern in both `claim` and `cancel` by updating the Deposit status to a terminal state before executing any external token transfer or native value transfer, such that a failed transfer does not leave the Deposit in a modified intermediate state.
5. IF a `claim` call on a Deposit has already succeeded and changed that Deposit's status to a terminal state, THEN THE BeamEscrow SHALL revert any subsequent `claim` call referencing the same deposit identifier, without transferring any funds.
6. IF signature verification in `claim` fails for any reason, THEN THE BeamEscrow SHALL revert the transaction and emit no state changes, leaving the Deposit status unchanged.

### Requirement 6: Ephemeral Key Generation & BeamLink Construction

**User Story:** As a Sender, I want the application to generate a secure ephemeral key and construct a BeamLink, so that only the holder of that link can claim the funds.

#### Acceptance Criteria

1. WHEN a Sender initiates deposit creation in the browser, THE CreateBeamModal SHALL generate a fresh EphemeralKey using viem's `generatePrivateKey()` before submitting the on-chain transaction.
2. WHEN the on-chain deposit transaction is confirmed and a DepositId is returned, THE CreateBeamModal SHALL construct a BeamLink in the format `{window.location.origin}/claim#key={ephemeralPrivateKey}&id={depositId}`.
3. THE CreateBeamModal SHALL store the EphemeralKey exclusively in the URL hash fragment and SHALL NOT transmit the EphemeralKey to any server or include it in any HTTP request path or query parameter.
4. WHEN a BeamLink is displayed to the Sender, THE CreateBeamModal SHALL provide a one-click copy-to-clipboard action that copies the full BeamLink URL to the clipboard and displays a confirmation indicator within 1 second of the copy action.
5. WHEN a BeamLink is displayed to the Sender, THE CreateBeamModal SHALL provide share buttons for iMessage, X (Twitter), and WhatsApp using their respective deep-link URL schemes where each button encodes the full BeamLink URL as the message body.
6. IF the on-chain deposit transaction fails or no DepositId is returned within 60 seconds, THEN THE CreateBeamModal SHALL discard the generated EphemeralKey from memory, display an error message indicating the deposit failed, and return to the deposit creation state without displaying a BeamLink.

### Requirement 7: Create Flow — Asset Selection & Fee Estimation

**User Story:** As a Sender, I want to pick the asset and amount to send and see an estimated fee before confirming, so that I can make an informed decision about my transaction.

#### Acceptance Criteria

1. THE CreateBeamModal SHALL present a numeric amount input field, accepting values between 0.000001 and 999,999,999 (up to 6 decimal places), and an asset dropdown listing native ETH and all ERC-20 tokens available in the Sender's connected wallet on RobinhoodChain.
2. WHEN a Sender enters a valid amount and selects an asset, THE CreateBeamModal SHALL display an estimated gas fee in ETH, updated within 3 seconds of the last input change, before the Sender confirms the transaction.
3. WHEN a Sender selects an ERC-20 token and the BeamEscrow contract's current allowance for that token is less than the entered amount, THE CreateBeamModal SHALL present an approval step requiring the Sender to submit an approval transaction before the deposit transaction step becomes active.
4. WHEN a Sender's connected wallet balance for the selected asset is less than the entered amount, or the Sender's ETH balance is less than the estimated gas fee, THE CreateBeamModal SHALL display an insufficient balance error message and disable the confirm button.
5. THE CreateBeamModal SHALL display a step indicator reflecting exactly the following ordered states: approval pending → approval confirming → deposit pending → deposit confirming → link generated, where each state becomes active only after the preceding state completes, and approval pending and approval confirming states are shown only when an ERC-20 approval transaction is required.
6. IF the gas fee estimation request fails, THEN THE CreateBeamModal SHALL display an error message indicating that fee estimation is unavailable and disable the confirm button until a successful estimate is retrieved.
7. IF a Sender enters an amount of zero or a non-numeric value in the amount input field, THEN THE CreateBeamModal SHALL display a validation error message and disable the confirm button.

### Requirement 8: Claim Page — Hash Fragment Extraction & Deposit Metadata

**User Story:** As a Recipient, I want the claim page to securely read my BeamLink data and display the deposit details, so that I know what I am about to receive before I authenticate.

#### Acceptance Criteria

1. WHEN a Recipient opens a BeamLink in a browser, THE ClaimPage SHALL extract the `key` and `id` parameters from `window.location.hash` on the client side.
2. WHEN the EphemeralKey and DepositId are extracted, THE ClaimPage SHALL query BeamEscrow to fetch the Deposit metadata (sender address, token address, amount, and claimed status) and SHALL consider the query failed if no response is received within 15 seconds.
3. WHEN deposit metadata is loaded, THE ClaimPage SHALL display the sender address truncated to its first 6 and last 4 characters separated by an ellipsis, the token symbol, the token amount formatted to the token's decimal precision with trailing zeros removed, and the network name.
4. WHEN the Deposit is already claimed, THE ClaimPage SHALL display a message indicating the link has already been used and SHALL NOT render a claim action button.
5. IF the `key` or `id` parameters are absent from the hash fragment, or if either value is not a non-empty alphanumeric string, THEN THE ClaimPage SHALL display an invalid link error message and SHALL NOT proceed to query BeamEscrow.
6. THE ClaimPage SHALL NOT log or transmit the raw EphemeralKey to any server-side endpoint.
7. IF the BeamEscrow query fails or times out, THEN THE ClaimPage SHALL display an error message indicating the deposit details could not be loaded and SHALL provide a retry action.

### Requirement 9: Claim Flow — Authentication & GaslessClaim Submission

**User Story:** As a Recipient, I want to authenticate with my social account and claim the funds without paying gas, so that I can receive crypto with zero prior Web3 experience.

#### Acceptance Criteria

1. WHEN a Recipient clicks the "Claim to Wallet" button, THE ClaimPage SHALL initiate Privy authentication, offering Apple, Google, Twitter sign-in options and the option to connect an existing wallet.
2. WHEN Privy authentication succeeds and the Recipient does not have an existing wallet, THE ClaimPage SHALL wait up to 30 seconds for Privy to provision an EmbeddedWallet before proceeding; IF provisioning does not complete within 30 seconds, THEN THE ClaimPage SHALL display an error message indicating that wallet setup timed out and SHALL offer a retry action that restarts the provisioning attempt.
3. WHEN a Recipient's wallet address is available after authentication, THE ClaimPage SHALL construct the ClaimPayload by signing `keccak256(abi.encodePacked(recipientAddress, depositId))` with the EphemeralKey using EIP-191 personal sign via viem.
4. WHEN the ClaimPayload signature is ready, THE ClaimPage SHALL submit the claim transaction on behalf of the Recipient via the Relayer so that the Recipient incurs zero gas cost, and SHALL display a pending state indicating that the transaction is being processed until an on-chain confirmation or failure is received.
5. IF the deposit has already been claimed prior to submission, THEN THE ClaimPage SHALL display an error message indicating the funds have already been claimed and SHALL NOT submit a claim transaction to the Relayer.
6. WHEN the claim transaction is confirmed on-chain, THE ClaimPage SHALL display a success state showing the claimed amount and recipient address, and SHALL render a confetti animation.
7. IF the claim transaction fails — whether due to Relayer rejection, submission error, or on-chain revert — THEN THE ClaimPage SHALL display an error message indicating the reason for the failure and SHALL offer a retry action that resubmits the same ClaimPayload to the Relayer without requiring the Recipient to re-authenticate.

### Requirement 10: Landing Page — Hero & Navigation

**User Story:** As a prospective user, I want a compelling landing page that communicates Beam's value proposition and lets me immediately start sending, so that I understand the product and can take action quickly.

#### Acceptance Criteria

1. THE LandingPage SHALL render a full-width hero section containing a headline with gradient-styled text emphasis on the word "beam", sub-hook copy of no more than 160 characters, a primary "Send a Beam" CTA button, and a secondary "How it works" anchor link that scrolls to the corresponding section on the same page.
2. THE LandingPage SHALL render a navigation bar containing the Beam logo, navigation links, and a "Connect & Send" button that opens the CreateBeamModal.
3. THE LandingPage SHALL render a stats strip in the hero section displaying exactly three quantitative product metrics: total beams sent, total value transferred, and number of supported tokens, each accompanied by a numeric value and a label.
4. THE LandingPage SHALL render a floating preview card in the hero section displaying a sample BeamLink claim card that includes a token amount of no more than 12 characters and at least one social share indicator.
5. WHEN a user clicks the primary "Send a Beam" CTA button, THE LandingPage SHALL open the CreateBeamModal within 300 milliseconds.
6. WHEN a user clicks the "Connect & Send" button in the navigation bar, THE LandingPage SHALL open the CreateBeamModal within 300 milliseconds.
7. IF the LandingPage fails to load the quantitative product metrics for the stats strip, THEN THE LandingPage SHALL display a placeholder value of "—" for each unavailable metric without hiding the stats strip.

### Requirement 11: Landing Page — Content Sections

**User Story:** As a prospective user, I want informational sections explaining how Beam works and its advantages, so that I can evaluate whether to use it.

#### Acceptance Criteria

1. THE LandingPage SHALL render a "How It Works" section containing exactly three cards in the following order: "Deposit" (describing fund locking), "Share" (describing link distribution), and "Claim" (describing recipient flow), where each card contains a title and a description of at least one sentence.
2. THE LandingPage SHALL render a "Why Beam" section containing a feature matrix of exactly 2 columns and 3 rows (6 cells total), where each cell displays a feature label and a short description, covering all six features: no wallet required, gasless claims, any chat app compatibility, ERC-20 and ETH support, instant social login, and cryptographic security.
3. THE LandingPage SHALL render an FAQ accordion section containing at least five question-and-answer pairs, where each pair covers one of the following topics — link security, recipient experience, supported tokens, cancellation, and gas fees — and each answer is collapsed by default and expands to reveal its full text when its question is activated.
4. WHEN a user activates the "Send a Beam" button in the bottom callout banner, THE LandingPage SHALL open the CreateBeamModal and the button shall be reachable via keyboard navigation and have an accessible label.
5. THE LandingPage SHALL render the bottom callout banner containing a headline of no more than 20 words and a visible "Send a Beam" button.

### Requirement 12: Visual Design System

**User Story:** As a user, I want the application to have a consistent dark-mode glassmorphism aesthetic, so that the interface feels premium, trustworthy, and suited to a fintech product.

#### Acceptance Criteria

1. THE Beam application SHALL apply a pitch-black background color of `#070709` as the base page background across all routes.
2. THE Beam application SHALL render a CSS grid overlay composed of lines spaced no greater than 40px apart at no more than 10% opacity, and a radial gradient using blue and purple hues at no more than 20% opacity, on the background of all primary pages.
3. THE Beam application SHALL style elevated surface containers with a semi-transparent dark background at no more than 60% opacity, a `backdrop-filter: blur` of at least 8px, and a 1px hairline border at no more than 15% opacity white.
4. THE Beam application SHALL use Geist Sans or Inter Display as the primary typeface for all UI text, falling back to a system sans-serif font if neither typeface is available.
5. THE Beam application SHALL style primary action buttons as pill-shaped (border-radius ≥ 999px) with a periwinkle-to-blue linear gradient background and a matching-color box-shadow glow effect on hover and focus states.
6. THE Beam application SHALL display micro-badges indicating the active chain name and gasless status on all transaction-initiating UI surfaces, and the badges SHALL remain visible for the full duration of the user's session.
7. THE Beam application SHALL operate exclusively in dark mode and SHALL NOT provide a light-mode toggle.
8. IF any required typeface fails to load, THEN THE Beam application SHALL fall back to the next available typeface in the font stack without causing layout shifts exceeding a Cumulative Layout Shift score of 0.1.

### Requirement 13: Next.js Application Structure & Configuration

**User Story:** As a developer, I want the application to be structured as a Next.js 14+ App Router project with correct dependency configuration, so that the codebase is maintainable and production-ready.

#### Acceptance Criteria

1. THE Beam application SHALL be implemented using Next.js 14 or later with the App Router and TypeScript with strict mode enabled.
2. THE Beam application SHALL configure Tailwind CSS for utility-based styling throughout all components, with no inline style attributes used for properties expressible via Tailwind utility classes.
3. THE Beam application SHALL integrate `@privy-io/react-auth` and `@privy-io/wagmi` for wallet provisioning and authentication, initialized with a Privy App ID sourced exclusively from the `NEXT_PUBLIC_PRIVY_APP_ID` environment variable.
4. THE Beam application SHALL integrate viem v2 and wagmi v2 for all on-chain read and write operations, with no other web3 libraries used for those purposes.
5. THE Beam application SHALL configure RobinhoodChain as the sole primary and default network in the wagmi config, such that no other chain is set as default.
6. THE Beam application SHALL use Lucide Icons as the exclusive icon library for all iconography throughout the UI.
7. THE Beam application SHALL use Framer Motion for all animated UI transitions, including the claim success confetti animation and modal entrance/exit animations, with no other animation libraries used for those purposes.
8. IF the `NEXT_PUBLIC_PRIVY_APP_ID` environment variable is absent or resolves to an empty string at startup, THEN THE Beam application SHALL throw an error with a message indicating the missing variable name before rendering any UI, leaving no application state modified.

### Requirement 14: Serialization & Link Integrity (Round-Trip Property)

**User Story:** As a developer, I want BeamLink construction and parsing to be lossless, so that the EphemeralKey and DepositId are always recoverable from the link.

#### Acceptance Criteria

1. THE CreateBeamModal SHALL encode the EphemeralKey as a lowercase hex string of exactly 64 characters (zero-padded if necessary) and the DepositId as a base-10 decimal string with no leading zeros when constructing the BeamLink hash fragment, producing a fragment of the form `#key=<hex>&id=<decimal>`.
2. WHEN the ClaimPage parses the hash fragment, THE ClaimPage SHALL decode the `key` parameter as a hex EphemeralKey of exactly 32 bytes and the `id` parameter as a BigInt DepositId, treating the fragment as invalid if either parameter is absent.
3. IF the `key` parameter in the hash fragment is not a valid 64-character lowercase hex string or the `id` parameter is not a valid base-10 decimal string representing a non-negative integer, THEN the ClaimPage SHALL reject the BeamLink and display an error message indicating the link is malformed, without attempting to process the deposit.
4. FOR ALL valid EphemeralKey values (32-byte sequences) and DepositId values (non-negative integers up to 2^256 - 1), encoding a BeamLink and then parsing the resulting hash fragment SHALL recover the original EphemeralKey byte-for-byte and the original DepositId value exactly (round-trip property).
