// User-authorized one-time deployment, hard-capped at 0.00012 ETH.
// Persists the signed transaction hash before broadcasting for safe recovery.
const fs = require('fs');
const { createPublicClient, createWalletClient, defineChain, http, keccak256, formatEther } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
require('@next/env').loadEnvConfig(process.cwd());
const recordPath = 'output/spectrum-check/mainnet-deployment.json';
const cap = 120000000000000n;
async function main() {
  const rpc = process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc.mainnet.chain.robinhood.com';
  const chain = defineChain({ id: 4663, name: 'Robinhood Chain', nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 }, rpcUrls: { default: { http: [rpc] } } });
  const client = createPublicClient({ chain, transport: http(rpc) });
  if (await client.getChainId() !== 4663) throw new Error('Wrong chain');
  const artifact = JSON.parse(fs.readFileSync('contracts/out/SpectrumEscrow.sol/SpectrumEscrow.json', 'utf8'));
  let record;
  if (fs.existsSync(recordPath)) {
    record = JSON.parse(fs.readFileSync(recordPath, 'utf8'));
    console.log('Resuming verification of recorded deployment', record.hash);
  } else {
    if (process.env.NEXT_PUBLIC_SPECTRUM_ESCROW_ADDRESS && !/^0x0{40}$/i.test(process.env.NEXT_PUBLIC_SPECTRUM_ESCROW_ADDRESS)) throw new Error('Escrow already configured; refusing another deployment');
    const account = privateKeyToAccount(process.env.RELAYER_PRIVATE_KEY);
    if (account.address.toLowerCase() !== '0x772a3fd27ef2047f03b35ae0abc5ec8c51b79d76') throw new Error('Deployment wallet differs from approved wallet');
    const wallet = createWalletClient({ account, chain, transport: http(rpc) });
    const [estimate, marketPrice, balance, nonce] = await Promise.all([
      client.estimateGas({ account: account.address, data: artifact.bytecode.object }),
      client.getGasPrice(), client.getBalance({ address: account.address }),
      client.getTransactionCount({ address: account.address, blockTag: 'pending' }),
    ]);
    const gas = estimate * 115n / 100n;
    const ceiling = cap / gas;
    if (marketPrice > ceiling) throw new Error('Current deployment price exceeds approved gas cap');
    const gasPrice = marketPrice * 110n / 100n < ceiling ? marketPrice * 110n / 100n : ceiling;
    if (gas * gasPrice > cap || balance < gas * gasPrice) throw new Error('Deployment budget check failed');
    const raw = await wallet.signTransaction({ chain, type: 'legacy', nonce, data: artifact.bytecode.object, gas, gasPrice, value: 0n });
    record = { chainId: 4663, sender: account.address, hash: keccak256(raw), maximumCostEth: formatEther(gas * gasPrice), status: 'prepared' };
    fs.mkdirSync('output/spectrum-check', { recursive: true });
    fs.writeFileSync(recordPath, JSON.stringify(record, null, 2) + '\n');
    console.log('Broadcasting approved deployment', record);
    await wallet.sendRawTransaction({ serializedTransaction: raw });
  }
  const receipt = await client.waitForTransactionReceipt({ hash: record.hash, timeout: 120000 });
  if (receipt.status !== 'success' || !receipt.contractAddress) throw new Error('Deployment failed; do not retry with a new transaction');
  const code = await client.getBytecode({ address: receipt.contractAddress });
  if (code?.toLowerCase() !== artifact.deployedBytecode.object.toLowerCase()) throw new Error('Deployed runtime does not match tested artifact');
  record = { ...record, status: 'verified', address: receipt.contractAddress, blockNumber: String(receipt.blockNumber), actualCostEth: formatEther(receipt.gasUsed * receipt.effectiveGasPrice), runtimeHash: keccak256(code) };
  fs.writeFileSync(recordPath, JSON.stringify(record, null, 2) + '\n');
  console.log(JSON.stringify(record, null, 2));
}
main().catch(error => { console.error(error.shortMessage || error.message); process.exitCode = 1; });
