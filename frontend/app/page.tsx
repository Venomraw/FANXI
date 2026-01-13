import Image from "next/image";
// Importing your Tactical Interface
import TacticalSliders from "@/src/components/TacticalSliders";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black font-sans text-white p-4">
      {/* --- HEADER SECTION --- */}
      <header className="mb-12 flex flex-col items-center gap-4">
        <Image
          className="dark:invert"
          src="/next.svg"
          alt="Next.js logo"
          width={120}
          height={24}
          priority
        />
        <div className="text-center">
          <h1 className="text-4xl font-black tracking-tighter text-green-500 uppercase">
            FanXI: World Cup 2026
          </h1>
          <p className="text-zinc-400 mt-2">Tactical Prediction Engine — Gear 5 Edition</p>
        </div>
      </header>

      {/* --- MAIN INTERFACE --- */}
      <main className="w-full max-w-xl">
        {/* This is the bridge between your UI and your FastAPI backend */}
        <TacticalSliders />
      </main>

      {/* --- FOOTER / LOGS --- */}
      <footer className="mt-16 flex gap-6 text-sm text-zinc-500">
        <a
          href="https://nextjs.org/docs"
          target="_blank"
          className="hover:text-green-400 transition-colors"
        >
          Documentation
        </a>
        <span>|</span>
        <p>Cyber-Secure Tactical Vault Active 🔒</p>
      </footer>
    </div>
  );
}