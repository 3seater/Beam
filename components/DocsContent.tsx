'use client';

import { useState } from 'react';
import {
  Info,
  AlertTriangle,
  ShieldCheck,
  ChevronDown,
  Zap,
  Lock,
  Globe,
  RefreshCw,
  Link2,
  ArrowUpRight,
  Wallet,
  LifeBuoy,
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────
   Small primitives — all use the CSS classes from docs.css
   ───────────────────────────────────────────────────────────── */

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="docs-section-eyebrow">{children}</p>;
}

function H1({ children }: { children: React.ReactNode }) {
  return <h1 className="docs-h1">{children}</h1>;
}

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="docs-h2">{children}</h2>;
}

function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="docs-h3">{children}</h3>;
}

function Lead({ children }: { children: React.ReactNode }) {
  return <p className="docs-lead">{children}</p>;
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="docs-p">{children}</p>;
}

function IC({ children }: { children: React.ReactNode }) {
  return <code className="docs-inline-code">{children}</code>;
}

function Divider() {
  return <hr className="docs-divider" />;
}

/* Code block */
function Pre({
  lang = '',
  label,
  children,
}: {
  lang?: string;
  label?: string;
  children: string;
}) {
  return (
    <div className="docs-pre" role="figure" aria-label={label ?? `${lang} code block`}>
      {label && <span className="docs-pre-label">{label}</span>}
      <code className="docs-code">{children.trim()}</code>
    </div>
  );
}

/* Callout */
function Callout({
  kind = 'info',
  children,
}: {
  kind?: 'info' | 'warning' | 'security';
  children: React.ReactNode;
}) {
  const icons: Record<string, React.ReactNode> = {
    info: <Info size={16} />,
    warning: <AlertTriangle size={16} />,
    security: <ShieldCheck size={16} />,
  };
  return (
    <div className={`docs-callout ${kind}`}>
      <span className="docs-callout-icon">{icons[kind]}</span>
      <span>{children}</span>
    </div>
  );
}

/* Card grid */
function CardGrid({ children }: { children: React.ReactNode }) {
  return <div className="docs-card-grid">{children}</div>;
}

function Card({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="docs-card">
      <div className="docs-card-icon">{icon}</div>
      <p className="docs-card-title">{title}</p>
      <p className="docs-card-desc">{desc}</p>
    </div>
  );
}

/* Steps */
function Steps({ children }: { children: React.ReactNode }) {
  return <ol className="docs-steps">{children}</ol>;
}

function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="docs-step">
      <span className="docs-step-num">{n}</span>
      <div className="docs-step-body">
        <p className="docs-step-title">{title}</p>
        <p className="docs-step-desc">{children}</p>
      </div>
    </li>
  );
}

/* Props list */
function PropList({ children }: { children: React.ReactNode }) {
  return <ul className="docs-prop-list">{children}</ul>;
}

function Prop({
  name,
  type,
  desc,
}: {
  name: string;
  type: string;
  desc: string;
}) {
  return (
    <li className="docs-prop-item">
      <div>
        <div className="docs-prop-name">{name}</div>
        <div className="docs-prop-type">{type}</div>
      </div>
      <div className="docs-prop-desc">{desc}</div>
    </li>
  );
}

/* Table
   Cells in each row are keyed inside the render map.
   Pass JSX cells with a key prop to avoid react/jsx-key lint errors. */
function Table({
  head,
  rows,
}: {
  head: string[];
  rows: React.ReactNode[][];
}) {
  return (
    <div className="docs-table-wrap">
      <table className="docs-table">
        <thead>
          <tr>{head.map(h => <th key={h}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((c, j) => <td key={`${i}-${j}`}>{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* FAQ accordion */
function FAQ({ items }: { items: { q: string; a: React.ReactNode }[] }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="docs-faq">
      {items.map((item, i) => (
        <div key={i} className={`docs-faq-item${open === i ? ' open' : ''}`}>
          <button
            className="docs-faq-trigger"
            onClick={() => setOpen(open === i ? null : i)}
            aria-expanded={open === i}
          >
            {item.q}
            <ChevronDown size={16} className="docs-faq-chevron" />
          </button>
          <div className="docs-faq-body" aria-hidden={open !== i}>
            {item.a}
          </div>
        </div>
      ))}
    </div>
  );
}

/* Method badge */
function Method({ m }: { m: 'POST' | 'GET' | 'DELETE' }) {
  return (
    <span className={`method-badge ${m.toLowerCase()}`}>{m}</span>
  );
}

/* Tag */
function Tag({
  color = 'blue',
  children,
}: {
  color?: 'blue' | 'green' | 'orange' | 'purple';
  children: React.ReactNode;
}) {
  return <span className={`docs-tag ${color}`}>{children}</span>;
}

/* ─────────────────────────────────────────────────────────────
   Section: Overview
   ───────────────────────────────────────────────────────────── */
export function SectionOverview() {
  return (
    <section id="overview" className="docs-section">
      <Eyebrow>Getting Started</Eyebrow>
      <H1>What is Beam?</H1>
      <Lead>
        Beam is a Web3 &ldquo;send-by-link&rdquo; protocol on{' '}
        <a href="https://robinhood.com/robinhood-chain" target="_blank" rel="noopener noreferrer">
          Robinhood Chain
        </a>{' '}
        — an Arbitrum Orbit L2. Deposit ETH or any ERC-20 token, get a shareable
        link, and send it to anyone. The recipient signs in and claims — no
        prior wallet or gas required.
      </Lead>

      <CardGrid>
        <Card
          icon={<Link2 size={18} />}
          title="Send as a link"
          desc="Funds live on-chain in the BeamEscrow contract. The claim key lives only in the URL fragment — never sent to a server."
        />
        <Card
          icon={<Wallet size={18} />}
          title="No wallet to receive"
          desc="Recipients sign in and claim. Privy creates an embedded smart wallet for them automatically."
        />
        <Card
          icon={<Zap size={18} />}
          title="Gasless claims"
          desc="The Beam Relayer submits the claim transaction and covers gas. Recipients pay nothing."
        />
        <Card
          icon={<RefreshCw size={18} />}
          title="Fully cancellable"
          desc="Senders can cancel any unclaimed Beam at any time to recover their tokens."
        />
      </CardGrid>

      <H3>Supported assets</H3>
      <P>
        Beam supports native ETH and any ERC-20 token deployed on Robinhood Chain —
        including stock-paired tokens like <IC>NVDA</IC>, <IC>MSFT</IC>, and{' '}
        <IC>AAPL</IC>.
      </P>

      <AssetsTable />
    </section>
  );
}

function AssetsTable() {
  const rows: React.ReactNode[][] = [
    ['ETH', <Tag key="t1" color="blue">Native</Tag>, 'Robinhood Chain', 'Zero address used as token field in escrow'],
    ['ERC-20', <Tag key="t2" color="green">Token</Tag>, 'Robinhood Chain', 'Standard transferFrom / transfer'],
    ['Stock tokens', <Tag key="t3" color="purple">Stock-paired</Tag>, 'Robinhood Chain', 'Fractional equities as ERC-20s'],
  ];
  return (
    <Table
      head={['Asset', 'Type', 'Chain', 'Notes']}
      rows={rows}
    />
  );
}

/* ─────────────────────────────────────────────────────────────
   Section: Quick Start
   ───────────────────────────────────────────────────────────── */
function SectionQuickStart() {
  return (
    <section id="quick-start" className="docs-section">
      <Eyebrow>Getting Started</Eyebrow>
      <H2>Quick Start</H2>
      <Lead>Send your first Beam in under five minutes.</Lead>

      <Steps>
        <Step n={1} title="Connect your wallet">
          Click <strong>Connect wallet</strong> in the top-right nav. Beam uses Privy
          for authentication — choose an available sign-in method or connect an existing wallet.
        </Step>
        <Step n={2} title="Pick a token and amount">
          Hit <strong>Send a Beam</strong>. Select an asset (ETH, NVDA, MSFT, …) and
          enter the amount you want to send.
        </Step>
        <Step n={3} title="Approve the token (ERC-20 only)">
          For ERC-20s, your wallet will prompt you to approve the{' '}
          <IC>BeamEscrow</IC> contract to spend tokens on your behalf. ETH deposits
          skip this step.
        </Step>
        <Step n={4} title="Deposit and get your link">
          Confirm the deposit transaction. Once the tx is confirmed, Beam constructs
          your unique link and displays it with copy and share buttons.
        </Step>
        <Step n={5} title="Share the link">
          Send the link via iMessage, WhatsApp, X, or anywhere. The recipient just
          opens it, signs in, and claims — no existing wallet needed.
        </Step>
      </Steps>

      <Callout kind="warning">
        Anyone who has the complete link can claim the funds. Share it privately,
        the same way you would a payment link.
      </Callout>

      <H3>Recipient flow</H3>
      <P>
        When a recipient opens a Beam link they&apos;ll see the amount and asset. They tap{' '}
        <strong>Claim my Beam</strong>, sign in, and the Relayer
        submits the claim on their behalf. Funds land in their Privy embedded wallet
        within seconds.
      </P>

      <Pre lang="text" label="Beam link anatomy">
        {`usebe.am/claim
  #key=<64-hex-char ephemeral private key>
  &id=<uint256 deposit id>`}
      </Pre>

      <Callout kind="security">
        The ephemeral key lives exclusively in the URL hash fragment. It is never
        sent to any server, never logged, and is discarded after the claim completes.
      </Callout>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
   Section: How It Works
   ───────────────────────────────────────────────────────────── */
function SectionHowItWorks() {
  return (
    <section id="how-it-works" className="docs-section">
      <Eyebrow>Getting Started</Eyebrow>
      <H2>How It Works</H2>
      <Lead>
        Beam combines an on-chain escrow contract, ephemeral key cryptography, social
        authentication, and a gasless relayer into a single seamless UX.
      </Lead>

      <H3>Send flow</H3>
      <Pre lang="text" label="Send data flow">
        {`1. Sender connects wallet
2. generatePrivateKey()            → ephemeralPrivKey  (in memory only)
   deriveAddress(ephemeralPrivKey) → claimSignerAddress
3. [ERC-20]  approve(BeamEscrow, amount)
4. depositNative(claimSignerAddress) { value: amount }
   OR
   depositToken(token, amount, claimSignerAddress)
5. tx confirmed → depositId returned by contract
6. buildBeamLink(origin, ephemeralPrivKey, depositId) → BeamLink
7. BeamLink displayed with copy + share buttons
   ephemeralPrivKey stays in JS memory until page unload`}
      </Pre>

      <H3>Claim flow</H3>
      <Pre lang="text" label="Claim data flow">
        {`1. Recipient opens BeamLink
2. parseHashFragment(location.hash)
   → { ephemeralPrivKey, depositId }
3. getDeposit(depositId)
   → { sender, token, amount, claimed }
4. Recipient clicks "Claim to Wallet"
5. Privy.login() → recipient chooses an available sign-in method
6. await embeddedWallet (provisioned by Privy, up to 30 s)
7. recipientAddress = embeddedWallet.address
8. msg = keccak256(abi.encodePacked(recipientAddress, depositId))
   sig = eip191Sign(ephemeralPrivKey, msg)
9. POST /relay/claim { depositId, recipientAddress, sig }
10. Relayer → BeamEscrow.claim(depositId, recipientAddress, sig)
11. tx confirmed → funds transferred → confetti 🎉`}
      </Pre>

      <H3>System components</H3>
      <SystemComponentsTable />
    </section>
  );
}

function SystemComponentsTable() {
  const rows: React.ReactNode[][] = [
    [<IC key="r1">BeamEscrow.sol</IC>, 'Holds funds on-chain; enforces claim / cancel rules'],
    ['Next.js Frontend', 'CreateBeamModal (sender) and ClaimPage (recipient)'],
    ['Relayer API', 'POST /relay/claim — submits claim tx, covers gas'],
    ['Privy', 'Authentication with supported sign-in methods + embedded wallet provisioning'],
    ['Alchemy RPC', 'JSON-RPC provider for Robinhood Chain (chainId 4663)'],
  ];
  return (
    <Table head={['Component', 'Role']} rows={rows} />
  );
}

/* ─────────────────────────────────────────────────────────────
   Section: Smart Contract
   ───────────────────────────────────────────────────────────── */
function SectionSmartContract() {
  return (
    <section id="smart-contract" className="docs-section">
      <Eyebrow>Protocol</Eyebrow>
      <H2>Smart Contract</H2>
      <Lead>
        <IC>BeamEscrow.sol</IC> is the single on-chain component of the protocol.
        It is deployed on Robinhood Chain (chainId <IC>4663</IC>) and built on
        OpenZeppelin v5.
      </Lead>

      <H3>Deposit struct</H3>
      <Pre lang="solidity" label="BeamEscrow.sol">
        {`struct Deposit {
    address sender;        // wallet that created the Beam
    address token;         // ERC-20 address, or address(0) for native ETH
    uint256 amount;        // token amount or ETH value
    address claimSigner;   // derived from the ephemeral private key
    bool    claimed;       // true after claim() or cancel()
    uint256 createdAt;     // block.timestamp at deposit
}`}
      </Pre>

      <H3>Functions</H3>

      <H3>depositNative</H3>
      <Pre lang="solidity">
        {`function depositNative(address claimSignerAddress)
    external
    payable
    returns (uint256 depositId)`}
      </Pre>
      <PropList>
        <Prop name="claimSignerAddress" type="address" desc="The public address derived from the ephemeral private key. Stored as the authorised claim signer." />
        <Prop name="msg.value" type="uint256" desc="Native ETH to lock in escrow. Must be > 0." />
        <Prop name="returns" type="uint256" desc="The newly assigned depositId (monotonically increasing from 1)." />
      </PropList>

      <H3>depositToken</H3>
      <Pre lang="solidity">
        {`function depositToken(
    address tokenAddress,
    uint256 amount,
    address claimSignerAddress
) external returns (uint256 depositId)`}
      </Pre>
      <P>
        Pulls <IC>amount</IC> of <IC>tokenAddress</IC> from the caller via{' '}
        <IC>transferFrom</IC>. The caller must <IC>approve</IC> BeamEscrow first.
      </P>

      <H3>claim</H3>
      <Pre lang="solidity">
        {`function claim(
    uint256 depositId,
    address recipientAddress,
    bytes calldata signature
) external nonReentrant`}
      </Pre>
      <P>
        Verifies that <IC>signature</IC> is a valid EIP-191 signature over{' '}
        <IC>keccak256(abi.encodePacked(recipientAddress, depositId))</IC> produced by
        the deposit&apos;s <IC>claimSigner</IC> key. On success, transfers funds to{' '}
        <IC>recipientAddress</IC> and marks the deposit as claimed.
      </P>

      <H3>cancel</H3>
      <Pre lang="solidity">
        {`function cancel(uint256 depositId) external nonReentrant`}
      </Pre>
      <P>
        Only the original sender may cancel. Refunds the full deposited amount and
        marks <IC>claimed = true</IC> to prevent future claims. Emits a{' '}
        <IC>Cancelled</IC> event.
      </P>

      <H3>Events</H3>
      <Table
        head={['Event', 'Emitted when', 'Indexed fields']}
        rows={[
          [<IC key="e1">Deposited</IC>, 'depositNative or depositToken succeeds', 'depositId, sender'],
          [<IC key="e2">Claimed</IC>, 'claim() succeeds', 'depositId, recipient'],
          [<IC key="e3">Cancelled</IC>, 'cancel() succeeds', 'depositId, sender'],
        ]}
      />

      <Callout kind="info">
        The deposit counter starts at <IC>1</IC>. A <IC>depositId</IC> of{' '}
        <IC>0</IC> is never valid and will cause <IC>claim</IC> and{' '}
        <IC>cancel</IC> to revert.
      </Callout>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
   Section: Security
   ───────────────────────────────────────────────────────────── */
function SectionSecurity() {
  return (
    <section id="security" className="docs-section">
      <Eyebrow>Protocol</Eyebrow>
      <H2>Security</H2>
      <Lead>
        Beam&apos;s security model is built around one key property: the ephemeral
        private key never touches a server. Everything else flows from that.
      </Lead>

      <H3>Ephemeral key model</H3>
      <P>
        When a sender creates a Beam, the browser calls <IC>viem.generatePrivateKey()</IC>{' '}
        to produce a one-time <IC>secp256k1</IC> key pair entirely in-memory.
        The public address (<IC>claimSignerAddress</IC>) is stored on-chain.
        The private key is embedded only in the URL hash fragment, which is:
      </P>
      <ul style={{ margin: '0 0 18px', paddingLeft: '24px', color: '#5f7b8f', fontSize: '14px', lineHeight: '2' }}>
        <li>Never sent to any server (browsers don&apos;t include fragments in HTTP requests)</li>
        <li>Never written to application logs or analytics</li>
        <li>Never persisted — discarded when the page unloads</li>
      </ul>

      <H3>On-chain claim verification</H3>
      <P>
        <IC>BeamEscrow.claim</IC> uses OpenZeppelin&apos;s <IC>ECDSA.recover</IC> to
        verify the signature. The signed payload is{' '}
        <IC>keccak256(abi.encodePacked(recipientAddress, depositId))</IC>. Including
        the <IC>depositId</IC> in the message prevents the same signature from being
        replayed against a different deposit.
      </P>

      <H3>Reentrancy protection</H3>
      <P>
        Both <IC>claim</IC> and <IC>cancel</IC> are decorated with OpenZeppelin&apos;s{' '}
        <IC>nonReentrant</IC> modifier and follow the Checks-Effects-Interactions
        pattern — state is updated before any external transfer call.
      </P>

      <H3>Practical guidance</H3>
      <Callout kind="warning">
        <strong>Share links privately.</strong> The link is the key. Anyone with the
        complete URL can claim the funds. Treat it like a signed cheque — don&apos;t
        post it publicly.
      </Callout>
      <Callout kind="security">
        <strong>Cancel unused Beams.</strong> If you share a Beam and the recipient
        doesn&apos;t claim it, cancel it from <em>Your Beams</em> to recover your
        tokens. Unclaimed Beams stay valid indefinitely.
      </Callout>

      <H3>Security properties summary</H3>
      <Table
        head={['Property', 'Mechanism']}
        rows={[
          ['Ephemeral key never leaves the browser', 'URL hash fragment — excluded from all HTTP requests'],
          ['Replay attack prevention', 'depositId included in signed payload'],
          ['Reentrancy protection', 'OpenZeppelin nonReentrant + CEI pattern'],
          ['Signature verification', 'OpenZeppelin ECDSA.recover on-chain'],
          ['Invalid address prevention', 'Contract reverts on address(0) for token / signer / recipient'],
          ['Double-claim prevention', 'claimed flag checked before any transfer, set before external call'],
        ]}
      />
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
   Section: Relayer
   ───────────────────────────────────────────────────────────── */
function SectionRelayer() {
  return (
    <section id="relayer" className="docs-section">
      <Eyebrow>Protocol</Eyebrow>
      <H2>Relayer</H2>
      <Lead>
        The Relayer is a lightweight backend service that submits claim transactions
        on behalf of recipients so they never need ETH to pay gas.
      </Lead>

      <H3>How it works</H3>
      <P>
        After a recipient authenticates and their embedded wallet is ready, the
        ClaimPage constructs a <IC>ClaimPayload</IC> — an EIP-191 signature over{' '}
        <IC>keccak256(abi.encodePacked(recipientAddress, depositId))</IC> — and
        POSTs it to <IC>/api/relay/claim</IC>. The Relayer validates the payload,
        then calls <IC>BeamEscrow.claim</IC> from its own funded wallet, covering gas.
      </P>

      <H3>Payload</H3>
      <Pre lang="json" label="POST /api/relay/claim">
        {`{
  "depositId":       "42",
  "recipientAddress": "0xabc…",
  "signature":       "0xdef…"
}`}
      </Pre>

      <PropList>
        <Prop name="depositId" type="string (uint256)" desc="The deposit to claim, as a decimal string." />
        <Prop name="recipientAddress" type="address" desc="The recipient's embedded wallet address. Must match the address in the signature." />
        <Prop name="signature" type="bytes (hex)" desc="EIP-191 signature of keccak256(abi.encodePacked(recipientAddress, depositId)), produced by the ephemeral private key." />
      </PropList>

      <H3>Response</H3>
      <Table
        head={['Status', 'Body', 'Meaning']}
        rows={[
          ['200', <IC key="b1">{`{ "txHash": "0x…" }`}</IC>, 'Claim tx submitted successfully'],
          ['400', <IC key="b2">{`{ "error": "…" }`}</IC>, 'Invalid payload (missing fields, bad signature)'],
          ['409', <IC key="b3">{`{ "error": "already claimed" }`}</IC>, 'Deposit was already claimed or cancelled'],
          ['500', <IC key="b4">{`{ "error": "…" }`}</IC>, 'Relayer wallet error or RPC failure'],
        ]}
      />

      <Callout kind="info">
        The Relayer is not required for senders — only for gasless claims. Senders
        always pay gas directly from their connected wallet.
      </Callout>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
   Section: API Reference
   ───────────────────────────────────────────────────────────── */
function SectionApiReference() {
  return (
    <section id="api-reference" className="docs-section">
      <Eyebrow>Reference</Eyebrow>
      <H2>API Reference</H2>
      <Lead>
        All API routes are Next.js Route Handlers under <IC>/api</IC>. They are
        internal to the Beam frontend and not intended as a public API — but the
        contracts and structures below are stable.
      </Lead>

      <H3>Endpoints</H3>
      <Table
        head={['Method', 'Route', 'Description']}
        rows={[
          [<Method key="m1" m="POST" />, <IC key="r1">/api/relay/claim</IC>, 'Submit a gasless claim on behalf of a recipient'],
          [<Method key="m2" m="GET" />, <IC key="r2">/api/tokens</IC>, 'Fetch the list of supported tokens and metadata'],
          [<Method key="m3" m="GET" />, <IC key="r3">/api/price</IC>, 'Get current USD price for a token symbol'],
          [<Method key="m4" m="GET" />, <IC key="r4">/api/token-logo</IC>, 'Proxy token logo images'],
          [<Method key="m5" m="POST" />, <IC key="r5">/api/beams</IC>, 'Persist Beam metadata for the sender history view'],
          [<Method key="m6" m="GET" />, <IC key="r6">/api/beams</IC>, 'Retrieve Beam history for a sender address'],
          [<Method key="m7" m="POST" />, <IC key="r7">/api/rpc</IC>, 'Proxied JSON-RPC calls to Robinhood Chain'],
          [<Method key="m8" m="POST" />, <IC key="r8">/api/swap</IC>, 'Initiate a token swap before sending'],
        ]}
      />

      <Divider />

      <H3>GET /api/tokens</H3>
      <P>Returns the list of tokens available in the asset picker.</P>
      <Pre lang="json" label="Response 200">
        {`[
  {
    "symbol":   "ETH",
    "name":     "Ether",
    "address":  "0x0000000000000000000000000000000000000000",
    "decimals": 18,
    "logoUrl":  "/api/token-logo?symbol=ETH"
  },
  {
    "symbol":   "NVDA",
    "name":     "NVIDIA (Stock Token)",
    "address":  "0xTokenAddress…",
    "decimals": 18,
    "logoUrl":  "/api/token-logo?symbol=NVDA"
  }
]`}
      </Pre>

      <H3>GET /api/price?symbol=ETH</H3>
      <Pre lang="json" label="Response 200">
        {`{ "symbol": "ETH", "usd": 2847.51 }`}
      </Pre>

      <H3>POST /api/relay/claim</H3>
      <P>See the <a href="#relayer" className="docs-inline-link">Relayer section</a> for the full request and response schema.</P>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
   Section: FAQ
   ───────────────────────────────────────────────────────────── */
function SectionFaq() {
  const items = [
    {
      q: 'Does the recipient need a wallet or crypto account?',
      a: 'No. They open the link, tap Claim my Beam, and sign in. Privy automatically creates an embedded smart wallet for them. No seed phrases or browser extensions needed.',
    },
    {
      q: 'What tokens can I send?',
      a: 'Native ETH, any ERC-20 token on Robinhood Chain, and stock-paired tokens like NVDA, MSFT, and AAPL. Use the asset picker in the Send flow to see everything available.',
    },
    {
      q: 'Who pays the gas fee?',
      a: 'The sender pays gas for the deposit transaction. The recipient\'s claim is submitted by the Beam Relayer — they pay nothing.',
    },
    {
      q: 'Can I get my tokens back if the link is never claimed?',
      a: 'Yes. Open Your Beams, find the unclaimed Beam, and cancel it. The full amount is returned to your wallet. Links never expire — they stay valid until claimed or cancelled.',
    },
    {
      q: 'Is the link safe to send over iMessage or WhatsApp?',
      a: 'Yes, as long as you only share it with the intended recipient. The link is the key — anyone who has it can claim. Treat it like a payment link: send it via a private message, not a public post.',
    },
    {
      q: 'What is Robinhood Chain?',
      a: 'Robinhood Chain is an Arbitrum Orbit L2 (chainId 4663) built by Robinhood. It supports the EVM and is where BeamEscrow is deployed. It enables the stock-paired token transfers that make Beam unique.',
    },
    {
      q: 'Can I integrate Beam into my own app?',
      a: 'The BeamEscrow contract ABI and address are public. You can interact with it directly using viem or ethers.js to build depositNative / depositToken flows. The Relayer is not currently exposed as a public API.',
    },
    {
      q: 'Does a Beam link expire?',
      a: 'No. Tokens stay locked in the escrow contract indefinitely until the Beam is claimed or cancelled by the sender.',
    },
  ];

  return (
    <section id="faq" className="docs-section">
      <Eyebrow>Reference</Eyebrow>
      <H2>FAQ</H2>
      <Lead>Common questions about using Beam.</Lead>
      <FAQ items={items} />
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
   Section: Support
   ───────────────────────────────────────────────────────────── */
function SectionSupport() {
  return (
    <section id="support" className="docs-section">
      <Eyebrow>Reference</Eyebrow>
      <H2>Support</H2>
      <Lead>
        Need help? Here&apos;s where to find it.
      </Lead>

      <CardGrid>
        <Card
          icon={<Globe size={18} />}
          title="X (Twitter)"
          desc="Follow @use_beam for updates, announcements, and community support."
        />
        <Card
          icon={<LifeBuoy size={18} />}
          title="Email"
          desc="Reach the team at hello@usebe.am for anything not covered in these docs."
        />
        <Card
          icon={<Lock size={18} />}
          title="Security"
          desc="Discovered a vulnerability? Please disclose responsibly to hello@usebe.am with 'Security' in the subject line."
        />
        <Card
          icon={<ArrowUpRight size={18} />}
          title="GitHub"
          desc="Smart contract source and verified ABI available on the Beam GitHub organisation."
        />
      </CardGrid>

      <Callout kind="info">
        These docs cover the Beam protocol as of September 2026. The smart contract
        is deployed and immutable — any future versions will be at a new address with
        updated documentation.
      </Callout>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
   Master export
   ───────────────────────────────────────────────────────────── */
export function DocsContent() {
  return (
    <article className="docs-content" aria-label="Documentation content">
      <SectionOverview />
      <Divider />
      <SectionQuickStart />
      <Divider />
      <SectionHowItWorks />
      <Divider />
      <SectionSmartContract />
      <Divider />
      <SectionSecurity />
      <Divider />
      <SectionRelayer />
      <Divider />
      <SectionApiReference />
      <Divider />
      <SectionFaq />
      <Divider />
      <SectionSupport />
    </article>
  );
}

/* ── TOC entries (consumed by page.tsx → DocsToc) ─────────────────────── */
export const DOC_TOC_ENTRIES = [
  { id: 'overview', label: 'Overview' },
  { id: 'quick-start', label: 'Quick Start' },
  { id: 'how-it-works', label: 'How It Works' },
  { id: 'smart-contract', label: 'Smart Contract' },
  { id: 'security', label: 'Security' },
  { id: 'relayer', label: 'Relayer' },
  { id: 'api-reference', label: 'API Reference' },
  { id: 'faq', label: 'FAQ' },
  { id: 'support', label: 'Support' },
] as const;

export const DOC_SECTION_IDS = DOC_TOC_ENTRIES.map(e => e.id);
