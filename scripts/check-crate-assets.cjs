const fs = require('fs');
const { createPublicClient, http, erc20Abi } = require('viem');
const catalog = require('../lib/crate-bundles.json');
const client = createPublicClient({ transport: http('https://rpc.mainnet.chain.robinhood.com') });
async function main() {
  const assets = [...new Map(catalog.flatMap(p => p.constituents).map(t => [t.address.toLowerCase(),t])).values()];
  for (const token of assets) {
    const decimals = await client.readContract({ address: token.address, abi: erc20Abi, functionName: 'decimals' });
    if (Number(decimals) !== token.decimals) {
      if (!process.argv.includes('--update')) throw new Error(token.symbol + ': decimals mismatch, onchain = ' + decimals);
      for (const bundle of catalog) for (const t of bundle.constituents) if (t.address.toLowerCase() === token.address.toLowerCase()) t.decimals = Number(decimals);
    }
    console.log(token.symbol, 'decimals', decimals);
  }
  if (process.argv.includes('--update')) fs.writeFileSync('lib/crate-bundles.json', JSON.stringify(catalog, null, 2) + '\n');
}
main().catch(e => { console.error(e.message); process.exitCode = 1; });
