import { LegalPage } from '@/components/LegalPage';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service — Beam',
  description: 'Terms governing your use of the Beam protocol and website.',
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      subtitle="Please read these terms carefully before using Beam."
      effectiveDate="September 1, 2026"
      sections={[
        {
          heading: '1. Acceptance of Terms',
          body: (
            <p>
              By accessing or using beam.finance (the "Site") or the Beam smart contract protocol
              (collectively, the "Service"), you agree to be bound by these Terms of Service
              ("Terms"). If you do not agree to these Terms, do not use the Service. These Terms
              apply to all visitors, senders, and recipients who interact with the Beam protocol.
            </p>
          ),
        },
        {
          heading: '2. Description of Service',
          body: (
            <>
              <p>
                Beam is a non-custodial token transfer protocol that allows users to send
                cryptocurrency tokens via a shareable link. The sender deposits tokens into the
                BeamEscrow smart contract deployed on Robinhood Chain. A recipient can claim those
                tokens using a one-time cryptographic key embedded in the link, without needing a
                pre-existing wallet.
              </p>
              <p>
                Beam provides a relayer service that submits claim transactions on behalf of
                recipients so they do not need to hold native gas tokens. The relayer is a
                convenience feature and is not guaranteed to be available at all times.
              </p>
            </>
          ),
        },
        {
          heading: '3. Eligibility',
          body: (
            <>
              <p>
                You must be at least 18 years of age and capable of entering into a binding legal
                agreement to use the Service. By using Beam, you represent and warrant that you meet
                these requirements.
              </p>
              <p>
                Beam is not available to residents of jurisdictions where use of cryptocurrency
                protocols is prohibited by applicable law. It is your responsibility to ensure your
                use of Beam complies with the laws of your jurisdiction.
              </p>
            </>
          ),
        },
        {
          heading: '4. Non-Custodial Nature',
          body: (
            <>
              <p>
                Beam is a non-custodial protocol. We do not at any point hold, control, or have
                access to your tokens. All funds are held in the BeamEscrow smart contract, which is
                governed solely by its on-chain code. We cannot freeze, recover, or reverse any
                transaction once it has been submitted to the blockchain.
              </p>
              <p>
                <span className="text-white/80 font-medium">Your Beam link is your key.</span> Anyone
                with access to your Beam link can claim the tokens contained within it. Keep your
                links secure and only share them with the intended recipient. We are not responsible
                for tokens claimed by unintended parties due to link exposure.
              </p>
            </>
          ),
        },
        {
          heading: '5. Risks',
          body: (
            <>
              <p>By using Beam, you acknowledge and accept the following risks:</p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>
                  <span className="text-white/80 font-medium">Smart contract risk.</span> The
                  BeamEscrow contract has been developed with security best practices and tested, but
                  no smart contract is free from the possibility of bugs or exploits.
                </li>
                <li>
                  <span className="text-white/80 font-medium">Link interception.</span> If your Beam
                  link is intercepted by a third party before the intended recipient claims it, the
                  tokens may be claimed by that third party.
                </li>
                <li>
                  <span className="text-white/80 font-medium">Blockchain risk.</span> Network
                  congestion, forks, or other conditions on Robinhood Chain may affect transaction
                  processing times or costs.
                </li>
                <li>
                  <span className="text-white/80 font-medium">Token risk.</span> The value of
                  tokens you send or receive may fluctuate significantly. Beam displays price
                  estimates for informational purposes only and does not guarantee accuracy.
                </li>
                <li>
                  <span className="text-white/80 font-medium">Relayer availability.</span> The
                  gasless relayer may be temporarily unavailable. In such cases, recipients with a
                  funded wallet can still claim directly by interacting with the BeamEscrow contract.
                </li>
              </ul>
            </>
          ),
        },
        {
          heading: '6. Prohibited Uses',
          body: (
            <>
              <p>You agree not to use Beam to:</p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>Violate any applicable local, national, or international law or regulation</li>
                <li>Conduct, facilitate, or conceal money laundering, fraud, or any other financial crime</li>
                <li>Send tokens to or from sanctioned individuals or entities</li>
                <li>Attempt to exploit, reverse-engineer, or compromise the BeamEscrow smart contract or the Beam relayer</li>
                <li>Use automated scripts or bots to interact with the Site in a manner that disrupts service for other users</li>
                <li>Impersonate Beam or any Beam team member in communications to third parties</li>
              </ul>
              <p>
                We reserve the right to block IP addresses or wallet addresses from the relayer
                service if we have reasonable grounds to believe they are engaged in prohibited activity.
              </p>
            </>
          ),
        },
        {
          heading: '7. Fees',
          body: (
            <p>
              Beam may charge a small protocol fee on deposits, deducted at the time of the on-chain
              deposit transaction. Any applicable fee will be clearly displayed before you confirm
              a deposit. Standard blockchain gas fees for deposit transactions are paid by the sender
              and are determined by network conditions, not by Beam. Claim transactions are relayed
              gaslessly by Beam at no cost to the recipient; however, this is a courtesy service
              and not a contractual obligation.
            </p>
          ),
        },
        {
          heading: '8. Intellectual Property',
          body: (
            <p>
              The Beam name, logo, website design, and related branding are the property of Beam and
              may not be used without our prior written permission. The BeamEscrow smart contract
              source code is published on-chain and may be reviewed by anyone. Nothing in these Terms
              grants you a license to reproduce or distribute our proprietary branding or off-chain
              software.
            </p>
          ),
        },
        {
          heading: '9. Disclaimer of Warranties',
          body: (
            <p>
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND,
              EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY,
              FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE
              SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR THAT DEFECTS WILL BE CORRECTED. USE
              OF THE SERVICE IS AT YOUR OWN RISK.
            </p>
          ),
        },
        {
          heading: '10. Limitation of Liability',
          body: (
            <p>
              TO THE FULLEST EXTENT PERMITTED BY LAW, BEAM AND ITS CONTRIBUTORS SHALL NOT BE LIABLE
              FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING
              LOSS OF TOKENS, LOSS OF DATA, OR LOSS OF PROFITS, ARISING OUT OF OR RELATED TO YOUR
              USE OF THE SERVICE, EVEN IF WE HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
              OUR TOTAL LIABILITY TO YOU FOR ANY CLAIM ARISING FROM THESE TERMS OR THE SERVICE SHALL
              NOT EXCEED THE GREATER OF (A) THE FEES PAID BY YOU TO BEAM IN THE TWELVE MONTHS
              PRECEDING THE CLAIM, OR (B) ONE HUNDRED U.S. DOLLARS (USD $100).
            </p>
          ),
        },
        {
          heading: '11. Indemnification',
          body: (
            <p>
              You agree to indemnify, defend, and hold harmless Beam and its affiliates, officers,
              contributors, and service providers from and against any claims, liabilities, damages,
              losses, and expenses — including reasonable legal fees — arising out of or in any way
              connected with your access to or use of the Service, your violation of these Terms, or
              your violation of any applicable law or the rights of any third party.
            </p>
          ),
        },
        {
          heading: '12. Governing Law and Disputes',
          body: (
            <p>
              These Terms are governed by and construed in accordance with the laws of the State of
              Delaware, United States, without regard to its conflict-of-law provisions. Any dispute
              arising under these Terms shall be resolved by binding arbitration administered under
              the rules of the American Arbitration Association, conducted in English. You waive any
              right to participate in a class action lawsuit or class-wide arbitration.
            </p>
          ),
        },
        {
          heading: '13. Changes to Terms',
          body: (
            <p>
              We reserve the right to modify these Terms at any time. When we make changes, we will
              update the effective date at the top of this page. Your continued use of the Service
              after any update constitutes acceptance of the revised Terms. We encourage you to
              review this page periodically.
            </p>
          ),
        },
        {
          heading: '14. Contact',
          body: (
            <p>
              For questions about these Terms, please contact us at{' '}
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
