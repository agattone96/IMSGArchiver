/**
 * OnboardingSkeleton.tsx
 * 
 * A high-fidelity React skeleton for the "imessage-archive" onboarding flow.
 * Stack: Tailwind CSS, React, Lucide Icons (representative)
 */

export const OnboardingSkeleton = () => {
  return (
    <div className="min-h-screen bg-[#0D1117] text-[#C9D1D9] font-sans selection:bg-[#58A6FF]/30">
      {/* Background Radial Vignette */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(0,0,0,0.4)_100%)]" />

      <main className="relative z-10 grid grid-cols-12 gap-8 max-w-7xl mx-auto min-h-screen items-center px-12">

        {/* LEFT RAIL: Step Timeline (3 Columns) */}
        <div className="col-span-3 h-fit py-12">
          <div className="relative pl-8">
            {/* Vertical Line */}
            <div className="absolute left-[7px] top-0 bottom-0 w-[2px] bg-gradient-to-b from-[#58A6FF] to-transparent shadow-[0_0_8px_rgba(88,166,255,0.3)]" />

            <div className="space-y-12">
              <Step
                num="1"
                title="Initialize"
                desc="Local-only Vault"
                status="active"
              />
              <Step
                num="2"
                title="Permission"
                desc="Full Disk Access"
                status="pending"
              />
              <Step
                num="3"
                title="Storage"
                desc="Setting directory"
                status="pending"
              />
              <Step
                num="4"
                title="Browse"
                desc="Ready to explore"
                status="pending"
              />
            </div>
          </div>
        </div>

        {/* CENTER PANEL: Primary Content (5 Columns) */}
        <div className="col-span-5 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="space-y-3">
            <h1 className="text-4xl font-semibold tracking-tight text-white leading-tight">
              Initialize your iMessage archive.
            </h1>
            <p className="text-lg text-[#8B949E] leading-relaxed">
              Export, index, and browse locally.<br />
              No cloud. No tracking.
            </p>
          </div>

          {/* Trust Card */}
          <div className="bg-[#161B22]/70 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-[11px] font-medium uppercase tracking-[0.15em] text-[#8B949E] mb-2">
              Privacy Commitments
            </h3>
            <div className="space-y-4">
              <TrustItem
                label="Local-only processing"
                desc="Messages never leave this machine."
              />
              <TrustItem
                label="Stored on this Mac"
                desc="Saved to your secure ~/Analyzed folder."
              />
              <TrustItem
                label="Read-only access"
                desc="Archiver cannot modify your data."
              />
            </div>
          </div>

          <p className="text-sm text-[#8B949E]">
            Next you’ll grant access to Messages and attachments so the archive can be built locally.
          </p>

          <div className="flex gap-4">
            <button className="flex-1 bg-[#238636] hover:bg-[#2EA043] text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 active:scale-[0.98]">
              Initialize Archive
            </button>
            <button className="flex-1 bg-[#21262D] hover:bg-[#30363D] border border-[#30363D] text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200">
              See what gets collected
            </button>
          </div>
        </div>

        {/* RIGHT PANEL: Preview Pane (4 Columns) */}
        <div className="col-span-4 h-full flex flex-col justify-center animate-in fade-in slide-in-from-right-8 duration-700 delay-200">
          <div className="relative group">
            {/* Blurred Archive Browser Preview */}
            <div className="rounded-xl overflow-hidden border border-white/10 shadow-3xl bg-[#161B22]">
              <div className="filter blur-md scale-[1.02] transition duration-500 group-hover:blur-sm">
                <div className="h-[400px] w-full flex">
                  {/* Mock Sidebar */}
                  <div className="w-1/3 border-r border-white/5 p-4 space-y-4">
                    <div className="h-4 w-3/4 bg-white/5 rounded" />
                    <div className="h-10 w-full bg-[#58A6FF]/10 rounded-lg border border-[#58A6FF]/20" />
                    {[1, 2, 3, 4].map(i => <div key={i} className="h-10 w-full bg-white/5 rounded-lg" />)}
                  </div>
                  {/* Mock Content */}
                  <div className="flex-1 p-6 space-y-6">
                    <div className="h-8 w-1/4 bg-white/5 rounded" />
                    <div className="space-y-4">
                      <div className="h-20 w-3/4 bg-[#58A6FF] rounded-r-xl rounded-tl-xl ml-auto opacity-80" />
                      <div className="h-12 w-2/3 bg-white/10 rounded-l-xl rounded-tr-xl opacity-60" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-[#0D1117] via-transparent to-transparent opacity-60" />
            </div>
            <p className="mt-4 text-center text-xs text-[#8B949E] italic tracking-wide">
              A preview of your upcoming vault console.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

const Step = ({ num, title, desc, status }: { num: string; title: string; desc: string; status: string }) => {
  const isActive = status === 'active';

  return (
    <div className={`relative flex flex-col gap-1 transition-opacity duration-300 ${status === 'pending' ? 'opacity-40' : 'opacity-100'}`}>
      <div className={`absolute -left-[28px] top-[6px] w-[14px] h-[14px] rounded-full border-2 bg-[#0D1117] z-10 
        ${isActive ? 'border-[#58A6FF] shadow-[0_0_12px_rgba(88,166,255,0.6)]' : 'border-[#30363D]'}`}
      />
      <span className={`text-sm font-bold ${isActive ? 'text-[#58A6FF]' : 'text-white'}`}>
        {num}. {title}
      </span>
      <span className="text-xs text-[#8B949E] tracking-tight">{desc}</span>
    </div>
  );
};

const TrustItem = ({ label, desc }: { label: string; desc: string }) => (
  <div className="flex items-start gap-3">
    <div className="mt-1 text-[#238636]">
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
      </svg>
    </div>
    <div>
      <p className="text-sm font-semibold text-white">{label}</p>
      <p className="text-[13px] text-[#8B949E]">{desc}</p>
    </div>
  </div>
);
