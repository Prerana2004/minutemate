// src/components/Hero.js
export default function Hero() {
  return (
    <div className="w-full text-center pt-12">
      <h2 className="text-4xl md:text-6xl font-bold text-gray-900">
        AI‑Powered Meeting Minutes Generator
      </h2>
      <h3 className="text-2xl md:text-3xl text-yellow-500 mt-4 font-semibold">
        All in one click.
      </h3>
      <p className="text-lg md:text-xl mt-4 max-w-2xl mx-auto text-gray-700">
        Record, transcribe, and summarize meetings automatically with MinuteMate.
      </p>
    </div>
  );
}
