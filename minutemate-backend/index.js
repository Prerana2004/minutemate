require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const ffmpeg = require("fluent-ffmpeg");
const axios = require("axios");
const mime = require("mime-types");
const path = require("path");
const PDFDocument = require("pdfkit");
const ffmpegPath = require("ffmpeg-static");

ffmpeg.setFfmpegPath(ffmpegPath);

const app = express();
const port = 5000;

const allowedOrigins = [
  "http://localhost:3000",
  "https://minutemate-lyart.vercel.app",
];

app.use(cors({
  origin: allowedOrigins,
  methods: ["GET", "POST"],
  credentials: true,
}));

app.use(express.json());
app.use("/exports", express.static(path.join(__dirname, "exports")));

const upload = multer({ dest: "uploads/" });

const normalizeSentence = (line) => line.replace(/\.*$/, ".");

function extractResponsible(text, speakerName) {
  const iWillRegex = /^\s*I\s+will/i;
  const namedPersonRegex = /\b([A-Z][a-z]+)\s+will\b/;

  if (iWillRegex.test(text)) return speakerName;

  const match = text.match(namedPersonRegex);
  return match ? match[1] : "Someone";
}

app.post("/transcribe-clean", upload.single("audio"), async (req, res) => {
  try {
    console.log("📥 Received file:", req.file?.originalname);

    if (!req.file) {
      return res.status(400).json({ error: "No audio file received" });
    }

    const audioPath = req.file.path;
    const wavPath = `${audioPath}.wav`;

    // Convert to WAV using ffmpeg
    await new Promise((resolve, reject) => {
      ffmpeg(audioPath)
        .toFormat("wav")
        .on("end", resolve)
        .on("error", reject)
        .save(wavPath);
    });

    const audioBuffer = fs.readFileSync(wavPath);

    // Send to Hugging Face Whisper API
    const response = await axios.post(
      "https://api-inference.huggingface.co/models/openai/whisper-large-v3",
      audioBuffer,
      {
        headers: {
          Authorization: `Bearer ${process.env.HF_TOKEN}`,
          "Content-Type": mime.lookup(wavPath) || "audio/wav",
          Accept: "application/json",
        },
        timeout: 300000,
      }
    );

    const rawTranscript = response.data.text || "";

    // Clean transcript
    const cleaned = rawTranscript
      .replace(/\[.*?\]/g, "")
      .replace(/\b(um+|uh+|you know|like)\b/gi, "")
      .replace(/\s{2,}/g, " ")
      .trim();

    const lines = cleaned
      .replace(/([.?!])\s+(?=[A-Z])/g, "$1|")
      .split("|")
      .map((line) => line.trim());

    const meetingTitleLine = lines.find((l) => /meeting/i.test(l)) || "Untitled Meeting";
    const meetingTitle = meetingTitleLine.replace(/^welcome to\s+/i, "").trim();
    const date = new Date().toLocaleDateString("en-IN", {
      day: "numeric", month: "long", year: "numeric",
    });

    const participantsList = (cleaned.match(/\b(I am|My name is|This is)\s+([A-Z][a-z]+)/g) || [])
      .map((p) => p.split(" ").slice(-1)[0])
      .filter((v, i, a) => a.indexOf(v) === i);

    const participants = participantsList.join(", ") || "Unknown";
    const speakerName = participantsList[0] || "Someone";

    const keyPoints = lines
      .filter((l) => l.length > 20 && !/welcome|hello|hi|thank/i.test(l))
      .slice(0, 5)
      .map((l) => `• ${normalizeSentence(l)}`)
      .join("\n") || "No key points found.";

    const decisions = lines
      .filter((l) => /(decided|we will|plan to|agreed|going to)/i.test(l))
      .map((l) => `• ${normalizeSentence(l)}`)
      .join("\n") || "No decisions mentioned.";

    const actionItems = lines
      .filter((l) => /\b(will|need to|shall|must|plan to|next step)\b/i.test(l))
      .map((l) => {
        const person = extractResponsible(l, speakerName);
        return `• ${normalizeSentence(l)} — Responsible: ${person}`;
      })
      .join("\n") || "No action items identified.";

    const summary = `Meeting Summary
=========================

Date: ${date}
Title: ${meetingTitle}
Participants: ${participants}

Key Points:
${keyPoints}

Decisions:
${decisions}

Action Items:
${actionItems}
`;

    // Save to disk
    const exportDir = path.join(__dirname, "exports");
    if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir);

    const fileId = `MeetingSummary_${Date.now()}`;
    const txtPath = path.join(exportDir, `${fileId}.txt`);
    const pdfPath = path.join(exportDir, `${fileId}.pdf`);

    fs.writeFileSync(txtPath, summary, "utf8");

    const doc = new PDFDocument();
    const writeStream = fs.createWriteStream(pdfPath);
    doc.pipe(writeStream);
    doc.fontSize(12).text(summary, { align: "left" });
    doc.end();

    await new Promise((resolve, reject) => {
      writeStream.on("finish", resolve);
      writeStream.on("error", reject);
    });

    // Clean up
    fs.unlinkSync(audioPath);
    fs.unlinkSync(wavPath);

    res.json({
      summary,
      transcript: cleaned,
    });
  } catch (error) {
    console.error("❌ Error:", error.message);

    if (error.response?.data) {
      console.error("🧾 Whisper API Response:", error.response.data);
      return res.status(error.response.status || 500).json({
        error: error.response.data,
        message: "Whisper API failed.",
      });
    }

    if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    if (req.file?.path && fs.existsSync(`${req.file.path}.wav`)) fs.unlinkSync(`${req.file.path}.wav`);

    res.status(500).json({ error: "Transcription failed. See server logs." });
  }
});

app.listen(port, () => {
  console.log(`🚀 Server listening on http://localhost:${port}`);
});
