// pages/Home.js
import { useState } from "react";
import Recorder from "./components/Recorder";
import Hero from "./components/Hero";
import { motion, AnimatePresence } from "framer-motion";
import { StopCircle } from "lucide-react";

export default function Home() {
  const [showRecorder, setShowRecorder] = useState(true);

  return (
    <>
      <Hero />

      <div className="flex flex-col items-center mt-10 w-full max-w-3xl mx-auto px-4">
        {/* Recorder Panel */}
        <AnimatePresence>
          {showRecorder && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="w-full bg-white/90 backdrop-blur rounded-2xl shadow-xl p-6"
            >
              <Recorder />
              <button
                onClick={() => setShowRecorder(false)}
                className="mt-6 w-full flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition"
              >
                <StopCircle size={18} /> Hide recorder
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
