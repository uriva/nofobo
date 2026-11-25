import { Link } from "react-router-dom";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-grape-900/60 pt-6 space-y-3">
      <h2 className="text-lg font-bold text-white">{title}</h2>
      <div className="text-grape-200/85 text-sm leading-relaxed space-y-3">
        {children}
      </div>
    </section>
  );
}

export default function Terms() {
  return (
    <div className="min-h-screen bg-[#0f0a1a] text-white flex flex-col">
      <nav className="border-b border-grape-900/50 bg-[#0f0a1a]/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            to="/"
            className="text-xl font-black text-white hover:text-grape-300 transition-colors"
          >
            NOFOBO
          </Link>
          <div className="flex items-center gap-5 text-sm">
            <Link
              to="/privacy"
              className="text-grape-400 hover:text-white transition-colors"
            >
              Privacy
            </Link>
            <Link to="/terms" className="text-white font-semibold">
              Terms
            </Link>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-12">
        <p className="text-xs font-semibold uppercase tracking-widest text-grape-400 mb-2">
          Last Updated: November 25, 2026
        </p>
        <h1 className="text-3xl sm:text-4xl font-black text-white mb-6">
          Terms of Service
        </h1>
        <p className="text-grape-200/85 text-sm leading-relaxed mb-8">
          Welcome to NOFOBO (<span className="text-grape-100">nofobo.uriv.me</span>
          ). By creating an account, joining a community, or using NOFOBO, you
          agree to these Terms of Service and our{" "}
          <Link
            to="/privacy"
            className="text-grape-300 underline hover:text-white"
          >
            Privacy Policy
          </Link>
          .
        </p>

        <div className="space-y-8">
          <Section title="1. Strict 18+ Eligibility">
            <p>
              You must be at least <strong className="text-white">18 years old</strong>{" "}
              (and legally able to enter into a binding agreement in your
              jurisdiction) to create an account or use NOFOBO. By registering,
              you represent and warrant that you are 18 or older and that the
              profile information you submit is accurate and truthful.
            </p>
          </Section>

          <Section title="2. The Service &amp; User Content">
            <p>
              NOFOBO lets invite-only communities run stable-matching rounds
              based on private pairwise profile comparisons and the Gale-Shapley
              algorithm, followed by 1:1 messaging for matched members.
            </p>
            <p>
              You retain ownership of the photos, bios, and messages you post,
              and grant NOFOBO a limited, revocable license to host, display,
              and process that content (including via InstantDB and OpenAI) as
              needed to operate the service for you and the communities you
              join. You represent that you have all necessary rights to every
              photo and piece of content you upload.
            </p>
          </Section>

          <Section title="3. Dating Safety, No Background Checks &amp; Liability Release">
            <p>
              <strong className="text-white">
                NOFOBO does not perform criminal background checks, identity
                verification, or screening of users or community organizers.
              </strong>{" "}
              We make no warranties or representations about the truthfulness,
              character, safety, or compatibility of any member.
            </p>
            <p>
              You are solely responsible for your interactions with other users,
              both inside NOFOBO and offline. Use good judgment, safeguard your
              personal and financial information, and take standard safety
              precautions (such as meeting in public places) when meeting anyone
              in person. To the fullest extent permitted by law, you release
              NOFOBO and its operators from any claims, demands, or damages
              arising out of or related to your online or offline interactions
              with other users or community organizers.
            </p>
          </Section>

          <Section title="4. Acceptable Use">
            <p>You agree not to:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                Use NOFOBO if you are under 18, or upload photos or information
                involving minors.
              </li>
              <li>
                Harass, stalk, intimidate, threaten, defraud, or abuse other
                members.
              </li>
              <li>
                Impersonate another person, misrepresent your identity or age,
                or upload someone else&apos;s photos without consent.
              </li>
              <li>
                Send spam, commercial solicitations, or unlawful content, or
                scrape, screenshot-redistribute, or reverse-engineer the
                platform.
              </li>
            </ul>
            <p>
              We and community administrators may remove content or suspend or
              terminate accounts that violate these Terms or threaten community
              safety.
            </p>
          </Section>

          <Section title="5. Account Deletion &amp; Termination">
            <p>
              You may stop using NOFOBO at any time. To request permanent
              deletion of your account, profile, photos, and chat history,
              contact the operator via{" "}
              <a
                href="https://uriv.me"
                target="_blank"
                rel="noopener noreferrer"
                className="text-grape-300 underline hover:text-white"
              >
                uriv.me
              </a>
              . We may also suspend or terminate access at our discretion for
              policy violations or service discontinuation.
            </p>
          </Section>

          <Section title="6. Disclaimer of Warranties">
            <p>
              NOFOBO IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS
              AVAILABLE&rdquo; WITHOUT WARRANTIES OF ANY KIND, EXPRESS, IMPLIED,
              OR STATUTORY, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY,
              FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT
              GUARANTEE THAT YOU WILL RECEIVE A MATCH OR THAT THE SERVICE WILL
              BE UNINTERRUPTED OR ERROR-FREE.
            </p>
          </Section>

          <Section title="7. Limitation of Liability">
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, NOFOBO AND ITS
              OPERATORS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL,
              SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF DATA,
              PROFITS, OR PERSONAL INJURY ARISING FROM YOUR USE OF NOFOBO OR
              INTERACTIONS WITH OTHER USERS. IN NO EVENT SHALL OUR TOTAL
              AGGREGATE LIABILITY EXCEED THE GREATER OF THE AMOUNT YOU PAID TO
              USE NOFOBO IN THE 12 MONTHS PRECEDING THE CLAIM OR FIFTY U.S.
              DOLLARS ($50).
            </p>
          </Section>

          <Section title="8. Governing Law &amp; Changes">
            <p>
              These Terms are governed by the laws of the{" "}
              <strong className="text-white">
                State of New Mexico, United States
              </strong>
              , without regard to conflict-of-law rules. We may update these
              Terms from time to time; continued use after changes take effect
              means you accept the updated Terms.
            </p>
            <p>
              Questions? Contact the operator via{" "}
              <a
                href="https://uriv.me"
                target="_blank"
                rel="noopener noreferrer"
                className="text-grape-300 underline hover:text-white"
              >
                uriv.me
              </a>
              .
            </p>
          </Section>
        </div>
      </main>

      <footer className="py-8 px-6 border-t border-grape-900/50 text-center text-grape-400 text-xs">
        <div className="max-w-3xl mx-auto flex flex-wrap items-center justify-center gap-4">
          <span>NOFOBO · 18+ Only</span>
          <span>&middot;</span>
          <Link to="/privacy" className="hover:text-white transition-colors">
            Privacy Policy
          </Link>
          <span>&middot;</span>
          <Link to="/terms" className="hover:text-white transition-colors">
            Terms of Service
          </Link>
          <span>&middot;</span>
          <a
            href="https://uriv.me"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white transition-colors"
          >
            uriv.me
          </a>
        </div>
      </footer>
    </div>
  );
}
