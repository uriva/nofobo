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

export default function Privacy() {
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
              className="text-white font-semibold"
            >
              Privacy
            </Link>
            <Link
              to="/terms"
              className="text-grape-400 hover:text-white transition-colors"
            >
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
          Privacy Policy
        </h1>
        <p className="text-grape-200/85 text-sm leading-relaxed mb-8">
          NOFOBO (&ldquo;No Fear Of Better Option&rdquo;, hosted via{" "}
          <span className="text-grape-100">nofobo.uriv.me</span> and its
          companion web application) is a community-based dating and stable
          matching service. This Privacy Policy explains what information we
          collect, how we use and share it, and your privacy rights.
        </p>

        <div className="space-y-8">
          <Section title="1. Strict 18+ Eligibility">
            <p>
              NOFOBO is strictly limited to adults aged{" "}
              <strong className="text-white">18 and older</strong>. We do not
              knowingly collect or retain personal information from anyone under
              18. If you believe a minor has created an account, please contact
              the operator via{" "}
              <a
                href="https://uriv.me"
                target="_blank"
                rel="noopener noreferrer"
                className="text-grape-300 underline hover:text-white"
              >
                uriv.me
              </a>{" "}
              so we can promptly remove the account and data.
            </p>
          </Section>

          <Section title="2. Information We Collect (Including Sensitive Dating Data)">
            <p>
              Because NOFOBO is a dating and matchmaking platform, much of the
              information you provide is sensitive personal data. By creating an
              account and profile, you explicitly consent to our collection and
              processing of:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong className="text-white">Account &amp; Contact Data:</strong>{" "}
                Email address (used for passwordless magic-code login) and phone
                number (when collected for a community).
              </li>
              <li>
                <strong className="text-white">Profile &amp; Demographic Data:</strong>{" "}
                First name, age, gender, sexual orientation and attraction
                preferences, relationship status, custom community tags,
                location, external links, written bio, and uploaded photos.
              </li>
              <li>
                <strong className="text-white">
                  Preferences, Comparisons &amp; Matches:
                </strong>{" "}
                Pairwise A-or-B profile comparisons, private ELO preference
                scores, match cycle outcomes, and community memberships.
              </li>
              <li>
                <strong className="text-white">Chats &amp; AI Assistance:</strong>{" "}
                Private 1:1 chat messages exchanged with your match, as well as
                onboarding chat messages and AI-generated profile descriptions.
              </li>
            </ul>
          </Section>

          <Section title="3. How Your Information Is Used &amp; Shared">
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong className="text-white">Community Profiles:</strong> Your
                profile details, photos, bio, and tags are shown to compatible
                members of the private communities you join so they can make
                pairwise comparisons. Phone numbers, when collected, are visible
                only to community administrators.
              </li>
              <li>
                <strong className="text-white">Matching Algorithm:</strong> Your
                pairwise selections remain private (no public popularity score)
                and are used solely to compute your private ranking and run the
                Gale-Shapley stable matching algorithm.
              </li>
              <li>
                <strong className="text-white">1:1 Match Chat:</strong> When a
                match is revealed, you and your match can exchange private 1:1
                messages within the app.
              </li>
              <li>
                <strong className="text-white">No Sale of Personal Data:</strong>{" "}
                We do not sell your personal data or share it with third-party
                advertisers.
              </li>
            </ul>
          </Section>

          <Section title="4. Subprocessors &amp; Third-Party Services">
            <p>
              We use the following service providers to operate NOFOBO:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong className="text-white">InstantDB:</strong> Primary
                real-time database, uploaded photo storage, and passwordless
                magic-code email authentication.
              </li>
              <li>
                <strong className="text-white">OpenAI:</strong> AI language
                model processing used for onboarding chat assistance and
                AI-assisted profile generation.
              </li>
              <li>
                <strong className="text-white">Cloudflare Workers:</strong>{" "}
                Backend API hosting and edge infrastructure (
                <span className="text-grape-100">nofobo.uriv.me</span>).
              </li>
              <li>
                <strong className="text-white">Render:</strong> Static web
                application hosting and delivery.
              </li>
            </ul>
          </Section>

          <Section title="5. Data Retention &amp; Account Deletion">
            <p>
              We retain your account, profile, photos, comparisons, and chat
              history while your account remains active so your communities and
              match cycles function properly. You may update your profile or
              photos at any time in the app, and you can request full account
              and data deletion at any time by contacting the operator via{" "}
              <a
                href="https://uriv.me"
                target="_blank"
                rel="noopener noreferrer"
                className="text-grape-300 underline hover:text-white"
              >
                uriv.me
              </a>{" "}
              with the email address associated with your account. We process
              verified deletion requests within 30 days.
            </p>
          </Section>

          <Section title="6. Your Privacy Rights (GDPR &amp; CCPA/CPRA)">
            <p>
              Depending on where you live (including the EEA, UK, Switzerland,
              and California), you may have the right to:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                Request access to and a copy of the personal data we hold about
                you.
              </li>
              <li>
                Request correction of inaccurate information or deletion of your
                personal data.
              </li>
              <li>
                Withdraw consent to processing sensitive dating data or object
                to certain processing.
              </li>
              <li>
                Exercise your rights without discrimination. We do not
                &ldquo;sell&rdquo; or &ldquo;share&rdquo; personal information
                for cross-context behavioral advertising under CCPA/CPRA.
              </li>
            </ul>
            <p>
              To exercise any privacy right, contact the operator via{" "}
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

          <Section title="7. Updates &amp; Contact">
            <p>
              We may update this Privacy Policy periodically and will revise the
              &ldquo;Last Updated&rdquo; date at the top of this page. For
              questions or requests, contact the operator via{" "}
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
