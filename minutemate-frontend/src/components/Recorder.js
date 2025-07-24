import { jsPDF } from "jspdf";
import React, { useState, useEffect, useRef } from 'react';

const Recorder = () => {
  const [recording, setRecording] = useState(false);
  const [audioURL, setAudioURL] = useState(null);
  const [transcription, setTranscription] = useState("");
  const [docLink, setDocLink] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
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
      setTranscription("Recording complete. Transcribing...");
      setDocLink("");
      setShowDropdown(false);

      const formData = new FormData();
      formData.append("file", audioBlob, "recording.webm");

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
    } catch (error) {
      console.error("Error uploading/transcribing:", error);
      setTranscription("An error occurred during transcription.");
    }
  };

  const downloadAsText = () => {
    const element = document.createElement("a");
    const file = new Blob([transcription], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = "meeting-summary.txt";
    document.body.appendChild(element);
    element.click();
  };

  const downloadAsPDF = () => {
    const doc = new jsPDF();
    const lines = doc.splitTextToSize(transcription, 180);
    doc.text(lines, 10, 20);
    doc.save("meeting-summary.pdf");
  };

  return (
    <div className="text-center p-6 bg-white rounded-xl shadow-lg max-w-xl mx-auto">
      <h2 className="text-2xl font-semibold mb-4">🎙 Audio Recorder</h2>

      {!recording ? (
        <button onClick={startRecording} className="bg-green-500 hover:bg-green-700 text-white px-4 py-2 rounded">
          Start Recording
        </button>
      ) : (
        <button onClick={stopRecording} className="bg-red-500 hover:bg-red-700 text-white px-4 py-2 rounded">
          Stop Recording
        </button>
      )}

      {audioURL && (
        <div className="mt-4">
          <audio controls src={audioURL}></audio>
          <p className="text-sm text-gray-500 mt-2">
            {transcription === "Recording complete. Transcribing..."
              ? transcription
              : "Recording available."}
          </p>
        </div>
      )}

      {transcription && (
        <div className="mt-6 bg-gray-100 p-4 rounded text-left shadow whitespace-pre-wrap">
          <h3 className="font-bold mb-2">📄 Full Meeting Summary:</h3>
          <pre className="text-gray-800 whitespace-pre-wrap break-words">{transcription}</pre>

          <div className="mt-4 relative inline-block text-left w-full">
            <button
              type="button"
              className="inline-flex justify-center w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-green-500 text-sm font-medium text-white hover:bg-green-600 focus:outline-none"
              onClick={() => setShowDropdown((prev) => !prev)}
            >
              Download Options
            </button>

            {showDropdown && (
        <div className="origin-top-right absolute left-0 mt-0 w-full rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-20">
          <div className="py-1 flex flex-col" role="menu" aria-orientation="vertical">
            <button
              onClick={downloadAsText}
              className="px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100 w-full"
              role="menuitem"
            >
              Download as .txt
            </button>

            <button
              onClick={downloadAsPDF}
              className="px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100 w-full"
              role="menuitem"
            >
              Download as PDF
            </button>

            {docLink && (
              <a
                href={docLink}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 text-sm text-left text-blue-600 hover:bg-gray-100 w-full block"
                role="menuitem"
              >
                View in Google Docs
              </a>
            )}
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
