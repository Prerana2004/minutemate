import { jsPDF } from "jspdf";
import { useState, useRef } from "react";

const Recorder = () => {
  const [recording, setRecording] = useState(false);
  const [audioURL, setAudioURL] = useState(null);
  const [summary, setSummary] = useState("");
  const [rawTranscript, setRawTranscript] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorderRef.current = new MediaRecorder(stream);

    mediaRecorderRef.current.ondataavailable = (e) => {
      audioChunksRef.current.push(e.data);
    };

    mediaRecorderRef.current.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
      const url = URL.createObjectURL(audioBlob);
      setAudioURL(url);
      setSummary("Recording complete. Transcribing...");
      setRawTranscript("");
      setShowDropdown(false);

      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");

      await uploadAndTranscribe(formData);
      audioChunksRef.current = [];
    };

    mediaRecorderRef.current.start();
    setRecording(true);
  };

  const stopRecording = () => {
    mediaRecorderRef.current.stop();
    setRecording(false);
  };

  const uploadAndTranscribe = async (formData) => {
    setIsUploading(true);
    try {
      const response = await fetch("https://minutemate.onrender.com/transcribe-clean", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data?.error || "An unexpected error occurred during transcription.";
        setSummary(`❌ ${errorMessage}`);
        setIsUploading(false);
        return;
      }

      setRawTranscript(data.transcript || "❌ Transcript not available.");
      setSummary(data.summary || "❌ Summary not available.");
    } catch (error) {
      console.error("Error uploading/transcribing:", error);
      setSummary("❌ Network or server error occurred.");
    }
    setIsUploading(false);
  };

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
    setSummary("");
    setRawTranscript("");
    setShowDropdown(false);
  };

  const handleFileUpload = async () => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append("audio", selectedFile);

    const blobURL = URL.createObjectURL(selectedFile);
    setAudioURL(blobURL);
    setSummary("Uploading file. Transcribing...");
    setRawTranscript("");

    await uploadAndTranscribe(formData);
  };

  const downloadAsText = () => {
    const element = document.createElement("a");
    const file = new Blob([summary], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = "meeting-summary.txt";
    document.body.appendChild(element);
    element.click();
  };

  const downloadAsPDF = () => {
    const doc = new jsPDF();
    const lines = doc.splitTextToSize(summary, 180);
    doc.text(lines, 10, 20);
    doc.save("meeting-summary.pdf");
  };

  return (
    <div className="text-center p-6 bg-white rounded-xl shadow-lg max-w-xl mx-auto">
      <h2 className="text-2xl font-semibold mb-4">🎧 Audio Recorder</h2>

      {/* 🎙️ Record Button */}
      <div className="flex justify-center gap-4 flex-wrap mb-4">
        {!recording ? (
          <button
            onClick={startRecording}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
          >
            Start Recording
          </button>
        ) : (
          <button
            onClick={stopRecording}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
          >
            Stop Recording
          </button>
        )}

        {/* 📁 Upload Button */}
        <label className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded cursor-pointer">
          Upload Audio
          <input
            type="file"
            accept="audio/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </label>

        <button
          onClick={handleFileUpload}
          disabled={!selectedFile}
          className={`${
            selectedFile ? "bg-indigo-500 hover:bg-indigo-600" : "bg-gray-400 cursor-not-allowed"
          } text-white px-4 py-2 rounded transition`}
        >
          Upload & Transcribe
        </button>
      </div>

      {/* 🎵 Audio Player */}
      {audioURL && (
        <div className="mt-4">
          <audio controls src={audioURL} className="w-full"></audio>
          <p className="text-sm text-gray-500 mt-2">
            {isUploading ? "🔄 Transcribing..." : "Recording available."}
          </p>
        </div>
      )}

      {/* 🗣 Full Transcript */}
      {rawTranscript && (
        <div className="mt-6 bg-gray-100 p-4 rounded text-left shadow whitespace-pre-wrap">
          <h3 className="font-bold mb-2">🗣 Full Transcript:</h3>
          <pre className="text-gray-800 break-words">{rawTranscript}</pre>
        </div>
      )}

      {/* 🖍 Summary + Download */}
      {summary && (
        <div className="mt-6 bg-gray-100 p-4 rounded text-left shadow whitespace-pre-wrap">
          <h3 className="font-bold mb-2">🖍 Meeting Summary:</h3>
          <pre className="text-gray-800 break-words">{summary}</pre>

          <div className="mt-4 relative inline-block text-left w-full">
            <button
              type="button"
              className="inline-flex justify-center w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-green-500 text-sm font-medium text-white hover:bg-green-600 focus:outline-none"
              onClick={() => setShowDropdown((prev) => !prev)}
            >
              Download Options
            </button>

            {showDropdown && (
              <div className="origin-top-right absolute left-0 mt-1 w-full rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-20">
                <div className="py-1 flex flex-col">
                  <button
                    onClick={downloadAsText}
                    className="px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100 w-full"
                  >
                    Download as .txt
                  </button>

                  <button
                    onClick={downloadAsPDF}
                    className="px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100 w-full"
                  >
                    Download as PDF
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Recorder;
