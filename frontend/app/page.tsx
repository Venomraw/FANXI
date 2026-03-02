import PitchBoard from "@/src/components/pitch/PitchBoard";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center bg-black font-sans text-white p-4">
      <header className="py-8">
        <h1 className="text-4xl font-black tracking-tighter text-green-500 uppercase italic">
          FanXI Hub
        </h1>
      </header>

      <main className="w-full max-w-4xl mt-4">
        <PitchBoard />
      </main>

      <footer className="mt-12 text-zinc-600 text-xs font-mono uppercase tracking-widest">
        Matchday Haki Connection: Secured
      </footer>
    </div>
  );
}
