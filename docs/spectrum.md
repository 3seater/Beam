# Spectrum bundles

Spectrum lives in the Send Beam flow, beside Single asset. Its nine presets in
`lib/crate-bundles.json` reproduce Crate's names, descriptions, token addresses,
and weights from `apps/web/src/config/baskets.ts` at commit
`f6c7b1be3d26e1451a941fd8ecd31a8377680f96` in https://github.com/3seater/Crate.
Weights allocate the ETH input budget; rounding dust goes to the last asset.
These are fixed baskets of tokens, not managed or rebalanced index funds.
All 24 token images are hosted locally under `public/tokens/crate`. Token
decimals were checked onchain: QGRID uses 9; the other assets use 18.
The flow shares the normal Beam frame, amount input, gift card, progress,
receipt, details modal, and claim-success wallet controls.

## Routing and custody

The server calls Enso's `/api/v1/shortcuts/bundle` with chain ID 4663 and the
`router` strategy. Every route retains its output inside the router. Exact
output references fund per-token approvals and a single `depositBundle` call.
All swaps and the deposit execute atomically. The router pulls no pre-existing
assets from the sender; the input is native ETH. Dust returns to the sender.
Route actions enforce 100 bps swap slippage. Unsupported or illiquid assets fail
the entire quote; there is no partial basket fallback.

SpectrumEscrow stores actual received balances, the sender cancellation address,
claim signer, preset identifier, and asset arrays. One claim releases every asset;
one cancellation refunds every asset to the sender. Claim signatures bind the
chain, escrow address, deposit ID and recipient. Private claim keys remain in
URL fragments and private link backups, never in quote requests.

Existing BeamEscrow deposits and links continue to use their existing contract.
Spectrum links add `kind=spectrum`. Server and local history distinguish the two
deposit namespaces so identical numeric IDs cannot overwrite each other.

## Enable sending

1. Keep `ENSO_API_KEY` server-side in the hosting environment. The supplied key is
   configured in the ignored local `.env.local`; it is not in source control.
2. Test and review `contracts/src/SpectrumEscrow.sol` before deploying real funds.
3. Deploy `contracts/script/DeploySpectrum.s.sol` on Robinhood Chain with a funded
   deployment account:

   ```sh
   forge script script/DeploySpectrum.s.sol:DeploySpectrum --rpc-url https://rpc.mainnet.chain.robinhood.com --account YOUR_DEPLOYMENT_ACCOUNT --broadcast
   ```

4. Set `NEXT_PUBLIC_SPECTRUM_ESCROW_ADDRESS` to that deployment, configure/fund
   `RELAYER_PRIVATE_KEY`, and rebuild the app. Preset browsing and allocation
   review work before deployment; sends and claims are gated.
5. Validate a small send, claim and cancellation onchain before launch.

Enso network support was verified against its authenticated networks API.
Reference: https://docs.enso.build/pages/build/examples/custom-call-bundle

Pending sends retain the transaction hash and claim key locally. Confirmation
retries resume that transaction instead of purchasing a second bundle.
The new-recipient claim flow observes refreshed authentication and wallet state
while sign-in and embedded-wallet creation complete.

Local quote/claim throttles are per-process. Use a shared rate-limit store for a
multi-instance deployment, as with the existing Beam relayer. Private link backup
continues to use the existing file store; restore requires a wallet signature.

## Validation

Run the escrow unit tests from `contracts` with `forge test --match-contract
SpectrumEscrowTest`. Run `anvil --fork-url
https://rpc.mainnet.chain.robinhood.com --port 8547`, then from the project root
run `node scripts/verify-spectrum-fork.cjs` to check Enso encoding and every
preset's send and claim using simulated funds. The script resets this local fork
to each quote's block and deploys the escrow locally; it never broadcasts to
Robinhood mainnet. It requires a local `ENSO_API_KEY` and the compiled Foundry
artifact. A mainnet small-value validation remains necessary after deployment.
