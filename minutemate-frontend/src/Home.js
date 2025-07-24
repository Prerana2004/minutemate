// pages/Home.js
import { useState } from "react";
import Recorder from "./components/Recorder";
import Hero from "./components/Hero";
import { motion, AnimatePresence } from "framer-motion";
import { StopCircle, UploadCloud } from "lucide-react";

export default function Home() {
  const [showRecorder, setShowRecorder] = useState(true);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [transcription, setTranscription] = useState("");
  const [audioURL, setAudioURL] = useState(null);
  const [docLink, setDocLink] = useState("");

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    const allowedTypes = ["audio/mpeg", "audio/webm"];
    if (file && allowedTypes.includes(file.type)) {
      setUploadedFile(file);
    } else {
      alert("Please upload a valid .webm or .mp3 file.");
      setUploadedFile(null);
    }
  };

  const handleFileUpload = async () => {
    if (!uploadedFile) return;

    setTranscription("Uploading file and transcribing...");
    setAudioURL(URL.createObjectURL(uploadedFile));
    setDocLink("");

    const formData = new FormData();
    formData.append("file", uploadedFile);

    try {
      const response = await fetch("http://localhost:5000/transcribe-clean", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (data.text) {
        setTranscription(data.text);
      } else {
        setTranscription("Transcription failed.");
      }

      if (data.docLink) {
        setDocLink(data.docLink);
      }
    } catch (err) {
      console.error("❌ Upload or transcription failed:", err.message);
      setTranscription("An error occurred during transcription.");
    }
  };

  return (
    <>
      <Hero />

      {/* Recorder and Upload Side-by-Side */}
      <div className="flex flex-col md:flex-row gap-6 mt-10 w-full max-w-5xl justify-center items-start mx-auto px-4">
        {/* Recorder Panel */}
        <AnimatePresence>
          {showRecorder && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="w-full md:w-1/2 bg-white/90 backdrop-blur rounded-2xl shadow-xl p-6"
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

        {/* Upload Panel */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="w-full md:w-1/2 bg-white/90 backdrop-blur rounded-2xl shadow-xl p-6 text-center"
        >
          <h2 className="text-lg font-semibold mb-4">Upload MP3/WebM File</h2>
          <input
            type="file"
            accept=".webm,.mp3,audio/mpeg,audio/webm"
            onChange={handleFileChange}
            className="mt-4"
          />
          <button
            onClick={handleFileUpload}
            disabled={!uploadedFile}
            className={`mt-4 px-5 py-2 rounded-full font-medium transition ${
              uploadedFile
                ? "bg-green-600 text-white hover:bg-green-700"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            <UploadCloud className="inline mr-2" size={16} /> Upload & Transcribe
          </button>

          {audioURL && (
            <div className="mt-6">
              <audio controls src={audioURL} className="w-full"></audio>
            </div>
          )}

          {transcription && (
            <div className="mt-6 bg-gray-100 p-4 rounded text-left shadow whitespace-pre-wrap">
              <h3 className="font-bold mb-2">📄 Transcription:</h3>
              <pre className="text-gray-800 whitespace-pre-wrap break-words">{transcription}</pre>

              {docLink && (
                <a
                  href={docLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-4 text-blue-600 hover:underline"
                >
                  View in Google Docs
                </a>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </>
  );
}
