const fs = require('fs');
const ts = require('typescript');
// Run from the project root against an Anvil fork on localhost:8547.
// All sends, deployments and claims below use simulated funds on that fork.
fs.mkdirSync('output/spectrum-check', { recursive: true });
fs.copyFileSync('lib/crate-bundles.json', 'output/spectrum-check/crate-bundles.json');
for (const file of ['spectrum', 'enso-bundle', 'robinhood-tokens']) {
  fs.writeFileSync(`output/spectrum-check/${file}.js`, ts.transpileModule(fs.readFileSync(`lib/${file}.ts`, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText);
}
const { createPublicClient, createWalletClient, http, defineChain, decodeEventLog, encodeAbiParameters, keccak256 } = require('viem');
const { generatePrivateKey, privateKeyToAccount } = require('viem/accounts');
const { buildSpectrumActions } = require('../output/spectrum-check/enso-bundle.js');
const { SPECTRUM_PRESETS, SPECTRUM_ABI, SPECTRUM_ASSETS: assets } = require('../output/spectrum-check/spectrum.js');
const key = fs.readFileSync('.env.local', 'utf8').match(/^ENSO_API_KEY=(.+)$/m)[1].trim();
async function check(preset) {
  const transport = http('http://127.0.0.1:8547', { timeout: 120000 });
  const base = createPublicClient({ transport });
  const chain = defineChain({ id: await base.getChainId(), name: 'Local fork', nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 }, rpcUrls: { default: { http: ['http://127.0.0.1:8547'] } } });
  const client = createPublicClient({ chain, transport });
  const wallet = createWalletClient({ chain, transport });
  const [sender, recipient] = await wallet.getAddresses();
  await client.request({ method: 'anvil_setBalance', params: [sender, '0x3635c9adc5dea00000'] });
  await client.request({ method: 'anvil_setNonce', params: [sender, '0x0'] });
  console.log('Local fork', chain.id, 'sender balance', (await client.getBalance({ address: sender })).toString());
  const artifact = JSON.parse(fs.readFileSync('contracts/out/SpectrumEscrow.sol/SpectrumEscrow.json', 'utf8'));
  console.log('Gas price', String(await client.getGasPrice()));
  const deployment = await wallet.deployContract({ account: sender, abi: artifact.abi, bytecode: artifact.bytecode.object, gas: 5000000n, gasPrice: 1000000000n, type: 'legacy' });
  const escrow = (await client.waitForTransactionReceipt({ hash: deployment })).contractAddress;
  const signer = privateKeyToAccount(generatePrivateKey());
  const params = new URLSearchParams({ chainId: '4663', fromAddress: sender, routingStrategy: 'router', refundReceiver: sender, skipQuote: 'true' });
  const r = await fetch('https://api.enso.build/api/v1/shortcuts/bundle?' + params, { method: 'POST', headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' }, body: JSON.stringify(buildSpectrumActions(preset, assets, 10000000000000000n, sender, signer.address, escrow)), signal: AbortSignal.timeout(60000) });
  const data = await r.json(); if (!r.ok) throw new Error(JSON.stringify(data));
  console.log('Enso encoding block', data.createdAt);
  await client.request({ method: 'anvil_reset', params: [{ forking: { jsonRpcUrl: 'https://rpc.mainnet.chain.robinhood.com', blockNumber: data.createdAt } }] });
  await client.request({ method: 'anvil_setBalance', params: [sender, '0x3635c9adc5dea00000'] });
  await client.request({ method: 'anvil_setNonce', params: [sender, '0x0'] });
  const redeploy = await wallet.deployContract({ account: sender, abi: artifact.abi, bytecode: artifact.bytecode.object, gas: 5000000n, gasPrice: 1000000000n, type: 'legacy' });
  const redeployed = (await client.waitForTransactionReceipt({ hash: redeploy })).contractAddress;
  if (redeployed.toLowerCase() !== escrow.toLowerCase()) throw new Error('Fork address changed');
  const hash = await wallet.sendTransaction({ account: sender, to: data.tx.to, data: data.tx.data, value: BigInt(data.tx.value), gas: 15000000n, gasPrice: 1000000000n, type: 'legacy' });
  const receipt = await client.waitForTransactionReceipt({ hash });
  if (receipt.status !== 'success') throw new Error('Full Enso transaction reverted on fork: ' + hash);
  const event = receipt.logs.filter(l => l.address.toLowerCase() === escrow.toLowerCase()).map(l => { try { return decodeEventLog({ abi: SPECTRUM_ABI, topics: l.topics, data: l.data }); } catch { return null; } }).find(e => e?.eventName === 'BundleDeposited');
  if (!event) throw new Error('No bundle event');
  const id = event.args.depositId;
  const b = await client.readContract({ address: escrow, abi: SPECTRUM_ABI, functionName: 'getBundle', args: [id] });
  if (b[5].length !== preset.symbols.length || b[6].some(n => n <= 0n)) throw new Error('Incomplete basket');
  console.log(preset.name, 'FORK SEND PASSED', { chainId: chain.id, assets: b[5], amounts: b[6].map(String), sender: b[0] });
  const signature = await signer.signMessage({ message: { raw: keccak256(encodeAbiParameters([{ type: 'uint256' }, { type: 'address' }, { type: 'uint256' }, { type: 'address' }], [BigInt(chain.id), escrow, id, recipient])) } });
  const claim = await wallet.writeContract({ account: sender, address: escrow, abi: SPECTRUM_ABI, functionName: 'claim', args: [id, recipient, signature] });
  if ((await client.waitForTransactionReceipt({ hash: claim })).status !== 'success') throw new Error('Claim reverted');
  console.log(preset.name, 'FORK CLAIM PASSED');
}
async function main() { for (const preset of SPECTRUM_PRESETS) await check(preset); }
main().catch(e => { console.error(e.shortMessage ?? e.message); process.exitCode = 1; });
