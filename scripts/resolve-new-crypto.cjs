const fs = require('fs');
const { createPublicClient, http, erc20Abi } = require('viem');
const ids = ['0x00dd2df2f17d431cf3a0938f06c9cf9abc5e9643b6cc466ca3f71f3af246edf3','0xc3cc877a8a7d28efdb5dbec9ae71724652431e6411aa1a9fc8928028da554aa1','0x590dcb6a87828bf688b48089a62239b693378f1fb64d2286e6a399ed8c005fdf','0xd64fbda67e1015df43fa5e49f02ca844729e5f94','0x237609918f330add285b8bc5f8f2922283d1c4c5'];
(async () => {
  const client = createPublicClient({ transport: http('https://rpc.mainnet.chain.robinhood.com') });
  if (await client.getChainId() !== 4663) throw new Error('Wrong chain');
  const tokens = await Promise.all(ids.map(async id => {
    const response = await fetch('https://api.dexscreener.com/latest/dex/pairs/robinhood/' + id);
    if (!response.ok) throw new Error('DEX API failed');
    const pair = (await response.json()).pairs[0];
    const address = pair.baseToken.address;
    const [symbol, decimals, code] = await Promise.all([
      client.readContract({ address, abi: erc20Abi, functionName: 'symbol' }),
      client.readContract({ address, abi: erc20Abi, functionName: 'decimals' }),
      client.getCode({ address }),
    ]);
    if (!code || code === '0x' || symbol.toUpperCase() !== pair.baseToken.symbol.toUpperCase()) throw new Error('Token verification failed');
    const logo = new URL(pair.info.imageUrl);
    logo.searchParams.set('width', '256'); logo.searchParams.set('height', '256'); logo.searchParams.set('format', 'png');
    const image = await fetch(logo);
    if (!image.ok) throw new Error('Logo fetch failed');
    const logoUrl = '/social/tokens/' + symbol.toLowerCase() + '.png';
    fs.writeFileSync('public' + logoUrl, Buffer.from(await image.arrayBuffer()));
    return { symbol, name: pair.baseToken.name, address, decimals, logoUrl, isStock: false, source: pair.url, originalLogo: pair.info.imageUrl };
  }));
  fs.writeFileSync('output/social/new-crypto-tokens.json', JSON.stringify(tokens, null, 2) + '\n');
  console.log(JSON.stringify(tokens, null, 2));
})().catch(e => { console.error(e); process.exit(1); });
