import { useNavigate } from "react-router-dom";
import db from "../db.ts";

export default function Landing() {
  const navigate = useNavigate();
  const { user } = db.useAuth();

  return (
    <div className="min-h-screen bg-[#0f0a1a]">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 bg-[#0f0a1a]/80 backdrop-blur-md border-b border-grape-900/50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black text-white tracking-tight">
              NOFOBO
            </span>
            <span className="text-xs text-grape-400 hidden sm:block">
              No Fear Of Better Option
            </span>
          </div>
          <button
            onClick={() => navigate(user ? "/app/compare" : "/app/auth")}
            className="bg-grape-600 hover:bg-grape-500 text-white px-6 py-2 rounded-full font-semibold transition-all hover:shadow-lg hover:shadow-grape-600/25"
          >
            {user ? "Go to App" : "Get Started"}
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-block mb-6 px-4 py-1.5 rounded-full bg-grape-950 border border-grape-800 text-grape-300 text-sm font-medium">
            Powered by Nobel Prize-winning mathematics
          </div>
          <h1 className="text-5xl sm:text-7xl font-black text-white mb-6 leading-tight">
            Too Many Options.
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-grape-400 to-purple-300">
              One Right Match.
            </span>
          </h1>
          <p className="text-xl text-grape-200/70 max-w-2xl mx-auto mb-10 leading-relaxed">
            Good relationships require focus, but you can't focus when you're
            juggling 20 conversations. NOFOBO uses the Gale-Shapley algorithm
            to find you one optimal match per week. One person, full attention.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate(user ? "/app/compare" : "/app/auth")}
              className="bg-gradient-to-r from-grape-600 to-purple-500 hover:from-grape-500 hover:to-purple-400 text-white px-8 py-4 rounded-full font-bold text-lg transition-all hover:shadow-xl hover:shadow-grape-600/30 hover:-translate-y-0.5"
            >
              Find Your Match
            </button>
            <a
              href="#how-it-works"
              className="border border-grape-700 text-grape-300 hover:bg-grape-950 px-8 py-4 rounded-full font-semibold text-lg transition-all"
            >
              See How It Works
            </a>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 border-y border-grape-900/50 bg-grape-950/30">
        <div className="max-w-4xl mx-auto px-6 grid grid-cols-3 gap-8 text-center">
          <div>
            <div className="text-3xl font-black text-white">1</div>
            <div className="text-grape-400 text-sm mt-1">
              Match per week
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-white">0</div>
            <div className="text-grape-400 text-sm mt-1">
              FOBO guaranteed
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-white text-transparent bg-clip-text bg-gradient-to-r from-grape-400 to-purple-300">&#8734;</div>
            <div className="text-grape-400 text-sm mt-1">
              Global reach
            </div>
          </div>
        </div>
      </section>

      {/* Comic Section */}
      <section id="how-it-works" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl font-black text-white text-center mb-4">
            How NOFOBO Works
          </h2>
          <p className="text-grape-300 text-center mb-16 text-lg max-w-2xl mx-auto">
            A comic guide to finding love through math
          </p>
          <div className="flex flex-col gap-8 items-center">
            <img
              src="/nofobo-comic.jpg"
              alt="NOFOBO comic explaining how the Gale-Shapley stable matching algorithm works for dating"
              className="max-w-2xl w-full rounded-2xl border border-grape-800"
            />
            <img
              src="/nofobo-profiles.jpg"
              alt="How profiles enable fair pairwise comparison"
              className="max-w-2xl w-full rounded-2xl border border-grape-800"
            />
            <img
              src="/nofobo-elo.jpg"
              alt="How personal ELO ratings build your preference ranking from pairwise choices"
              className="max-w-2xl w-full rounded-2xl border border-grape-800"
            />
          </div>
        </div>
      </section>

      {/* Why One Match */}
      <section className="py-24 px-6 bg-gradient-to-b from-grape-950/50 to-[#0f0a1a]">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-black text-white text-center mb-16">
            Why One Match Is{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-grape-400 to-purple-300">
              Better
            </span>
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-grape-950/50 border border-grape-900/50 rounded-2xl p-8">
              <div className="text-4xl mb-4">&#x1f9e0;</div>
              <h3 className="text-xl font-bold text-white mb-3">
                Focus Over Abundance
              </h3>
              <p className="text-grape-300 leading-relaxed">
                Talking to 20 people means none of them get real attention. One
                match means you can actually show up and give it a real shot.
                Getting the same person again? That's the math saying: this one's
                worth your time.
              </p>
            </div>
            <div className="bg-grape-950/50 border border-grape-900/50 rounded-2xl p-8">
              <div className="text-4xl mb-4">&#x1f4aa;</div>
              <h3 className="text-xl font-bold text-white mb-3">
                Stable Matching
              </h3>
              <p className="text-grape-300 leading-relaxed">
                Gale-Shapley guarantees no two people would rather be with each
                other than their assigned match. The math literally prevents
                FOBO.
              </p>
            </div>
            <div className="bg-grape-950/50 border border-grape-900/50 rounded-2xl p-8">
              <div className="text-4xl mb-4">&#x1f30d;</div>
              <h3 className="text-xl font-bold text-white mb-3">
                Global Soulmate
              </h3>
              <p className="text-grape-300 leading-relaxed">
                No geo restrictions. Your perfect match could be anywhere in the
                world. We optimize for soul compatibility, not proximity.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center bg-gradient-to-r from-grape-900/50 to-purple-900/50 border border-grape-800/50 rounded-3xl p-12">
          <h2 className="text-4xl font-black text-white mb-4">
            Ready to ditch the paradox of choice?
          </h2>
          <p className="text-grape-300 text-lg mb-8">
            Join NOFOBO and let Nobel Prize-winning math find your person.
          </p>
          <button
            onClick={() => navigate(user ? "/app/compare" : "/app/auth")}
            className="bg-gradient-to-r from-grape-600 to-purple-500 hover:from-grape-500 hover:to-purple-400 text-white px-10 py-4 rounded-full font-bold text-lg transition-all hover:shadow-xl hover:shadow-grape-600/30 hover:-translate-y-0.5"
          >
            Get Started Free
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-grape-900/50">
        <div className="max-w-4xl mx-auto text-center text-grape-500 text-sm">
          <p>NOFOBO - No Fear Of Better Option</p>
          <p className="mt-2">
            Built with the Gale-Shapley stable matching algorithm (Nobel Prize
            in Economics, 2012)
          </p>
        </div>
      </footer>
    </div>
  );
}
