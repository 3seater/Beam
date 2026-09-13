// Read-only deployment preflight. Never broadcasts a transaction or prints keys.
const fs = require('fs');
const { createPublicClient, http, formatEther, getContractAddress } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
require('@next/env').loadEnvConfig(process.cwd());
async function main() {
  const client = createPublicClient({ transport: http(process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc.mainnet.chain.robinhood.com') });
  if (await client.getChainId() !== 4663) throw new Error('Expected Robinhood Chain.');
  const account = privateKeyToAccount(process.env.RELAYER_PRIVATE_KEY);
  const artifact = JSON.parse(fs.readFileSync('contracts/out/SpectrumEscrow.sol/SpectrumEscrow.json', 'utf8'));
  const [balance, nonce, gas, gasPrice] = await Promise.all([
    client.getBalance({ address: account.address }),
    client.getTransactionCount({ address: account.address, blockTag: 'pending' }),
    client.estimateGas({ account: account.address, data: artifact.bytecode.object }),
    client.getGasPrice(),
  ]);
  const estimatedCost = gas * gasPrice;
  console.log(JSON.stringify({ chainId: 4663, candidateDeploymentWallet: account.address, balanceEth: formatEther(balance), gas: String(gas), estimatedDeploymentEth: formatEther(estimatedCost), enoughForDeployment: balance > estimatedCost, predictedAddress: getContractAddress({ from: account.address, nonce: BigInt(nonce) }), configuredEscrow: process.env.NEXT_PUBLIC_SPECTRUM_ESCROW_ADDRESS || null }, null, 2));
}
main().catch(error => { console.error(error.shortMessage || error.message); process.exitCode = 1; });
