// Fetch the official catalog and verify every stock/ETF deployment on chain 4663.
// Run: node scripts/audit-rh-assets.cjs
const fs = require('node:fs');
const path = require('node:path');
const { createPublicClient, http } = require('viem');

const abi = [
  { type: 'function', name: 'symbol', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { type: 'function', name: 'decimals', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] },
  { type: 'function', name: 'uid', stateMutability: 'view', inputs: [], outputs: [{ type: 'bytes32' }] },
];

async function main() {
  const response = await fetch('https://api.robinhood.com/rhj/assets', { signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`Catalog HTTP ${response.status}`);
  const catalog = await response.json();
  if (!Array.isArray(catalog.assets) || !catalog.assets.length) throw new Error('Empty or invalid catalog');
  const client = createPublicClient({ transport: http('https://rpc.mainnet.chain.robinhood.com', { timeout: 20000, batch: true }) });
  if (await client.getChainId() !== 4663) throw new Error('Unexpected RPC chain');
  const blockNumber = await client.getBlockNumber();
  const rows = [];
  for (let start = 0; start < catalog.assets.length; start += 6) {
    const batch = await Promise.all(catalog.assets.slice(start, start + 6).map(async (asset) => {
      const address = asset.deployments.find((d) => d.chainId === 4663)?.contractAddress;
      const row = { symbol: asset.tokenSymbol, address, status: asset.status };
      try {
        if (!address) throw new Error('No chain 4663 deployment');
        const [code, symbol, decimals, uid] = await Promise.all([
          client.getBytecode({ address, blockNumber }),
          ...['symbol', 'decimals', 'uid'].map((functionName) => client.readContract({ address, abi, functionName, blockNumber })),
        ]);
        if (!code || code === '0x') throw new Error('No deployed code');
        if (symbol !== asset.tokenSymbol) throw new Error(`Symbol mismatch: ${symbol}`);
        if (uid.toLowerCase() !== asset.id.toLowerCase()) throw new Error('Asset ID mismatch');
        if (decimals !== asset.tokenDecimals) throw new Error(`Decimals mismatch: ${decimals}`);
        return { ...row, verified: true, decimals, uid };
      } catch (error) {
        return { ...row, verified: false, error: error.message };
      }
    }));
    rows.push(...batch);
    console.log(`Checked ${rows.length}/${catalog.assets.length}`);
  }
  const report = { source: 'https://api.robinhood.com/rhj/assets', checkedAt: new Date().toISOString(), chainId: 4663, blockNumber: String(blockNumber), rows };
  fs.writeFileSync(path.join(__dirname, '../docs/rh-assets-audit.json'), JSON.stringify(report, null, 2) + '\n');
  const failures = rows.filter((row) => !row.verified);
  if (failures.length) {
    console.error(failures);
    process.exitCode = 1;
    return;
  }
  fs.writeFileSync(path.join(__dirname, '../lib/rh-assets-snapshot.json'), JSON.stringify({ checkedAt: report.checkedAt, assets: catalog.assets }, null, 2) + '\n');
  console.log(`Verified all ${rows.length} contracts. Updated catalog snapshot.`);
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
