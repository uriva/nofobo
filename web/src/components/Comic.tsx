export default function Comic() {
  const panels = [
    {
      title: "The Problem",
      emoji: "&#x1f624;",
      scene: "&#x1f4f1; &#x2764;&#xfe0f; &#x2764;&#xfe0f; &#x2764;&#xfe0f; &#x2764;&#xfe0f; &#x2764;&#xfe0f; &#x2764;&#xfe0f; &#x2764;&#xfe0f; &#x2764;&#xfe0f; &#x2764;&#xfe0f;",
      speech:
        "I have 247 matches and I can't pick ONE. What if there's someone better? What if I'm settling?!",
      caption: "FOBO: Fear Of Better Option. It's real, and it's ruining dating.",
      bg: "from-red-950 to-red-900/50",
      border: "border-red-800/50",
    },
    {
      title: "The Idea",
      emoji: "&#x1f4a1;",
      scene: "&#x1f468;&#x200d;&#x1f52c; &#x1f4dc;",
      speech:
        "What if instead of choosing FROM everyone... you just compared TWO people at a time?",
      caption:
        'In 1962, mathematicians Gale & Shapley proved you can find the BEST stable match this way.',
      bg: "from-amber-950 to-amber-900/50",
      border: "border-amber-800/50",
    },
    {
      title: "Your Job",
      emoji: "&#x1f449;",
      scene: "&#x1f464;  &#x2190; &#x1f464;  &#x1f464; &#x2192;",
      speech:
        'Just pick who you vibe with more. "Alex or Jordan?" That\'s it. That\'s the whole thing.',
      caption:
        "No overthinking. No agonizing over 100 profiles. Just two at a time.",
      bg: "from-blue-950 to-blue-900/50",
      border: "border-blue-800/50",
    },
    {
      title: "The Rating Engine",
      emoji: "&#x1f3af;",
      scene: "&#x1f4ca; &#x1f4c8; &#x1f3c6;",
      speech: "",
      caption: "",
      isSpecial: true,
      specialContent: (
        <div className="space-y-3 text-sm">
          <p className="text-grape-200 font-comic font-bold text-base">
            But wait &mdash; Gale-Shapley needs a full ranking of everyone. How
            do simple A-or-B picks become a ranked list?
          </p>
          <div className="space-y-2 text-grape-300 font-comic">
            <p>
              <span className="text-grape-100 font-bold">Your personal ELO scores</span>{" "}
              &mdash; inspired by chess ratings, but these are entirely private
              to you. There's no global popularity ladder.
            </p>
            <p>
              <span className="text-grape-100 font-bold">Each comparison</span>{" "}
              updates your personal scores: the person you picked goes up in{" "}
              <em>your</em> ranking, the other goes down. Other people's rankings
              are unaffected.
            </p>
            <p>
              <span className="text-grape-100 font-bold">Smart pairing:</span>{" "}
              we show you people with similar scores in your list, so each
              choice is maximally informative.
            </p>
          </div>
          <div className="mt-3 p-3 bg-grape-950/80 rounded-lg border border-grape-700">
            <p className="text-grape-200 font-comic text-xs">
              <span className="font-bold text-grape-100">This means taste matters.</span>{" "}
              If you're into quiet bookworms, your scores will reflect that
              &mdash; even if the rest of the world ranks differently.
            </p>
          </div>
          <div className="mt-3 p-3 bg-grape-950/80 rounded-lg border border-grape-700">
            <p className="text-grape-200 font-comic text-xs">
              <span className="font-bold text-grape-100">It&rsquo;s quick and easy:</span>{" "}
              just pick who you like more, over and over. Each pick tells us{" "}
              <em>who you prefer relative to whom</em>, so after enough picks your
              personal ranking converges into something solid enough for the
              matching algorithm to work with.
            </p>
          </div>
        </div>
      ),
      bg: "from-emerald-950 to-emerald-900/50",
      border: "border-emerald-700/50",
    },
    {
      title: "The Math",
      emoji: "&#x1f9ee;",
      scene: "&#x1f465; &#x2192; &#x1f4ca; &#x2192; &#x2696;&#xfe0f;",
      speech: "",
      caption: "",
      isSpecial: true,
      specialContent: (
        <div className="space-y-3 text-sm">
          <p className="text-grape-200 font-comic font-bold text-base">
            How Gale-Shapley works:
          </p>
          <div className="space-y-2 text-grape-300 font-comic">
            <p>
              <span className="text-grape-100 font-bold">Round 1:</span> Everyone
              "proposes" to their #1 choice
            </p>
            <p>
              <span className="text-grape-100 font-bold">If proposed to:</span>{" "}
              You keep the best offer, reject the rest
            </p>
            <p>
              <span className="text-grape-100 font-bold">Rejected?</span> Propose
              to your next choice
            </p>
            <p>
              <span className="text-grape-100 font-bold">Repeat</span> until
              everyone is matched
            </p>
          </div>
          <div className="mt-3 p-3 bg-grape-950/80 rounded-lg border border-grape-700">
            <p className="text-grape-200 font-comic text-xs">
              <span className="font-bold text-grape-100">The guarantee:</span>{" "}
              No two unmatched people would rather be with each other. The
              matching is <em>stable</em>. FOBO is mathematically impossible.
            </p>
          </div>
        </div>
      ),
      bg: "from-grape-950 to-grape-900/50",
      border: "border-grape-700/50",
    },
    {
      title: "The Reveal",
      emoji: "&#x2728;",
      scene: "&#x1f4e9;",
      speech:
        "Every Sunday, you get ONE match. Not 10. Not 100. The ONE person the algorithm says is best for you.",
      caption:
        "One match = full attention. No more spreading yourself across 47 conversations.",
      bg: "from-grape-950 to-purple-900/50",
      border: "border-purple-700/50",
    },
    {
      title: "The Result",
      emoji: "&#x1f496;",
      scene: "&#x1f46b; &#x2615;",
      speech:
        "I'm not wondering if there's someone better out there. The math already checked.",
      caption:
        "NOFOBO: because your soulmate deserves your full attention.",
      bg: "from-pink-950 to-pink-900/50",
      border: "border-pink-800/50",
    },
  ];

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {panels.map((panel, i) => (
        <div
          key={i}
          className={`bg-gradient-to-br ${panel.bg} ${panel.border} border-2 rounded-2xl overflow-hidden`}
        >
          {/* Panel header */}
          <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between">
            <span className="font-comic font-bold text-white text-lg">
              {i + 1}. {panel.title}
            </span>
            <span
              className="text-2xl"
              dangerouslySetInnerHTML={{ __html: panel.emoji }}
            />
          </div>

          <div className="p-5">
            {/* Scene illustration */}
            <div className="text-center text-3xl mb-4 py-4 bg-black/20 rounded-xl">
              <span dangerouslySetInnerHTML={{ __html: panel.scene }} />
            </div>

            {/* Speech bubble or special content */}
            {panel.isSpecial ? (
              <div className="mb-3">{panel.specialContent}</div>
            ) : (
              <>
                {panel.speech && (
                  <div className="relative bg-white/10 backdrop-blur rounded-xl p-4 mb-3">
                    <div className="absolute -top-2 left-6 w-4 h-4 bg-white/10 rotate-45" />
                    <p className="text-grape-100 font-comic text-sm leading-relaxed relative z-10">
                      "{panel.speech}"
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Caption */}
            {panel.caption && (
              <p className="text-grape-400 text-xs font-comic italic">
                {panel.caption}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
