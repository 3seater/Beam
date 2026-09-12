import { LegalPage } from '@/components/LegalPage';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy — Beam',
  description: 'How Beam collects, uses, and protects your information.',
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      subtitle="How we handle your information when you use Beam."
      effectiveDate="September 1, 2026"
      sections={[
        {
          heading: '1. Overview',
          body: (
            <>
              <p>
                Beam (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) operates beam.finance, a non-custodial token transfer
                protocol built on Robinhood Chain. This Privacy Policy explains what information we
                collect, how we use it, and your choices regarding that information.
              </p>
              <p>
                Because Beam is a decentralized application, we have limited ability to collect or
                control on-chain data. Blockchain transactions are public by nature and permanently
                recorded on Robinhood Chain. This policy covers only the off-chain data we handle
                through our website and API services.
              </p>
            </>
          ),
        },
        {
          heading: '2. Information We Collect',
          body: (
            <>
              <p>
                <span className="text-white/80 font-medium">Information you provide.</span> When you
                use Beam to send tokens, you generate an ephemeral cryptographic key pair in your
                browser. We do not store this key pair. The deposit ID and token amount are written
                directly to the Robinhood Chain smart contract by your wallet — we never hold or
                transmit your funds.
              </p>
              <p>
                <span className="text-white/80 font-medium">Authentication data.</span> If you choose
                to sign in via Privy (email, Google, or social login) to receive tokens into a
                managed wallet, Privy processes your authentication credentials under their own
                privacy policy. We receive only a wallet address and a session token to identify
                your embedded wallet.
              </p>
              <p>
                <span className="text-white/80 font-medium">Automatically collected data.</span> Our
                servers and infrastructure providers may log standard request metadata including IP
                addresses, browser user-agent strings, referring URLs, and request timestamps for
                security monitoring and abuse prevention. These logs are retained for up to 30 days
                and are not sold or shared with third parties for marketing purposes.
              </p>
              <p>
                <span className="text-white/80 font-medium">On-chain data.</span> Wallet addresses,
                token amounts, and transaction hashes are recorded on the public Robinhood Chain
                blockchain. This information is inherently public and outside our control.
              </p>
            </>
          ),
        },
        {
          heading: '3. How We Use Information',
          body: (
            <>
              <p>We use the information we collect to:</p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>Provide and operate the Beam protocol and website</li>
                <li>Relay gasless claim transactions on behalf of recipients</li>
                <li>Monitor for abuse, fraud, and security incidents</li>
                <li>Display token prices and market data through third-party APIs</li>
                <li>Respond to support inquiries sent to hello@beam.finance</li>
                <li>Comply with applicable legal obligations</li>
              </ul>
              <p>
                We do not use your data for advertising, profiling, or any purpose unrelated to
                operating the Beam service.
              </p>
            </>
          ),
        },
        {
          heading: '4. Third-Party Services',
          body: (
            <>
              <p>Beam integrates with the following third-party services, each subject to their own privacy policies:</p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li><span className="text-white/80 font-medium">Privy</span> — authentication and embedded wallet infrastructure (privy.io)</li>
                <li><span className="text-white/80 font-medium">Robinhood Chain RPC</span> — blockchain node access for reading and submitting transactions</li>
                <li><span className="text-white/80 font-medium">CoinGecko</span> — ETH/WETH price data</li>
                <li><span className="text-white/80 font-medium">DexScreener</span> — DEX token price data</li>
                <li><span className="text-white/80 font-medium">Robinhood Markets, Inc.</span> — stock token price quotes and asset metadata</li>
              </ul>
              <p>
                We do not control these services and encourage you to review their respective
                privacy policies before using Beam.
              </p>
            </>
          ),
        },
        {
          heading: '5. Cookies and Local Storage',
          body: (
            <p>
              Beam uses browser local storage and session storage solely to preserve your in-progress
              transaction state (e.g., remembering which step of the send flow you are on). We do not
              use tracking cookies, advertising cookies, or cross-site tracking technologies of any
              kind. Authentication session tokens set by Privy are governed by Privy&apos;s cookie policy.
            </p>
          ),
        },
        {
          heading: '6. Data Retention and Deletion',
          body: (
            <>
              <p>
                We retain server access logs for up to 30 days, after which they are automatically
                purged. We do not maintain a persistent database of user profiles, transaction
                history, or wallet addresses beyond what is already public on-chain.
              </p>
              <p>
                Because blockchain data is immutable, we cannot delete on-chain transaction records.
                If you used Privy for authentication, you may request deletion of your Privy account
                and associated data directly through Privy&apos;s platform or by contacting
                hello@beam.finance.
              </p>
            </>
          ),
        },
        {
          heading: '7. Security',
          body: (
            <p>
              Beam is designed to minimize the amount of sensitive data we handle. Private keys for
              gasless claim relaying are ephemeral and never stored on our servers. Funds flow
              directly through the BeamEscrow smart contract — we are never in custody of your
              tokens. While we take reasonable measures to protect the data we do handle, no system
              is completely secure. Do not share your Beam link with untrusted parties, as it
              contains the claim key required to withdraw the deposited tokens.
            </p>
          ),
        },
        {
          heading: '8. Children',
          body: (
            <p>
              Beam is not directed at children under the age of 18. We do not knowingly collect
              personal information from minors. If you believe a minor has provided us with personal
              data, please contact us at hello@beam.finance and we will take steps to remove it.
            </p>
          ),
        },
        {
          heading: '9. Changes to This Policy',
          body: (
            <p>
              We may update this Privacy Policy from time to time. When we do, we will update the
              effective date at the top of this page. Continued use of Beam after a policy update
              constitutes your acceptance of the revised terms. For material changes, we will make
              reasonable efforts to notify users via the website.
            </p>
          ),
        },
        {
          heading: '10. Contact',
          body: (
            <p>
              If you have questions, concerns, or requests regarding this Privacy Policy or your
              personal data, please contact us at{' '}
              <a href="mailto:hello@beam.finance" className="text-white/70 hover:text-white transition-colors underline underline-offset-2">
                hello@beam.finance
              </a>
              .
            </p>
          ),
        },
      ]}
    />
  );
}
