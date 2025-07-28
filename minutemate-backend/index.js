require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const ffmpeg = require("fluent-ffmpeg");
const axios = require("axios");
const mime = require("mime-types");
const path = require("path");
const nodemailer = require("nodemailer");
const PDFDocument = require("pdfkit"); 
const ffmpegPath = require("ffmpeg-static");
ffmpeg.setFfmpegPath(ffmpegPath);

const app = express();
const port = 5000;

const allowedOrigins = [
  "http://localhost:3000",
  "https://minutemate-lyart.vercel.app"
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST"],
}));

app.use(express.json());
app.use("/exports", express.static(path.join(__dirname, "exports")));

const upload = multer({ dest: "uploads/" });

const normalizeSentence = (line) => line.replace(/\.*$/, ".");

// TRANSCRIBE ROUTE
app.post("/transcribe-clean", upload.single("audio"), async (req, res) => {
  try {
    console.log("Request body:", req.body);
    console.log("📥 Received file:", req.file);
    console.log("📍 File saved at:", path.resolve(req.file.path));

    if (!req.file) {
      return res.status(400).json({ error: "No audio file received" });
    }

    const audioPath = req.file.path;
    const wavPath = `${audioPath}.wav`;

    await new Promise((resolve, reject) => {
      ffmpeg(audioPath)
        .toFormat("wav")
        .on("end", resolve)
        .on("error", reject)
        .save(wavPath);
    });

    if (!fs.existsSync(wavPath)) {
      throw new Error("WAV conversion failed");
    }

    const audioBuffer = fs.readFileSync(wavPath);
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

    const participants = (cleaned.match(/\b(I am|My name is|This is)\s+([A-Z][a-z]+)/g) || [])
      .map((p) => p.split(" ").slice(-1)[0])
      .filter((v, i, a) => a.indexOf(v) === i)
      .join(", ") || "Unknown";

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
        const person = (l.match(/\b[A-Z][a-z]+\b/) || [])[0] || "Someone";
        return `• ${normalizeSentence(l)} — Responsible: ${person}`;
      })
      .join("\n") || "No action items identified.";

    const summary = `📌 Meeting Summary\n=========================

📅 Date: ${date}
📝 Title: ${meetingTitle}
👥 Participants: ${participants}

🔑 Key Points:
${keyPoints}

✅ Decisions:
${decisions}

📌 Action Items:
${actionItems}\n`;

    const exportDir = path.join(__dirname, "exports");
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    const fileId = `MeetingSummary_${Date.now()}`;
    const txtPath = path.join(exportDir, `${fileId}.txt`);
    fs.writeFileSync(txtPath, summary, "utf8");

    const pdfPath = path.join(exportDir, `${fileId}.pdf`);
    const doc = new PDFDocument();

    const writeStream = fs.createWriteStream(pdfPath);
    doc.pipe(writeStream);
    doc.fontSize(12).text(summary, { align: 'left' });
    doc.end();

    await new Promise((resolve, reject) => {
      writeStream.on("finish", resolve);
      writeStream.on("error", reject);
    });

    fs.unlinkSync(audioPath);
    fs.unlinkSync(wavPath);

    res.json({
      text: summary,
      txtLink: `/exports/${fileId}.txt`,
      pdfLink: `/exports/${fileId}.pdf`,
    });
  } catch (error) {
    console.error("❌ Processing Error:", error.message);
    if (error.response?.data) console.error("🧾 Whisper API Response:", error.response.data);
    if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    if (req.file?.path && fs.existsSync(`${req.file.path}.wav`)) fs.unlinkSync(`${req.file.path}.wav`);
    res.status(500).json({ error: "Transcription failed." });
  }
});

// SEND SUMMARY VIA EMAIL
app.post("/send-summary", async (req, res) => {
  const { email, summaryText } = req.body;

  if (!email || !summaryText) {
    return res.status(400).json({ message: "Missing input" });
  }

  const exportDir = path.join(__dirname, "exports");
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }

  const tempPath = path.join(exportDir, `email_${Date.now()}.txt`);
  fs.writeFileSync(tempPath, summaryText, "utf8");

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  try {
    await transporter.sendMail({
      from: `"MinuteMate Bot" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "📝 Your Meeting Summary",
      text: `Here is your meeting summary attached.`,
      attachments: [{ filename: "MeetingSummary.txt", path: tempPath }],
    });

    fs.unlinkSync(tempPath);
    res.json({ message: "✅ Email sent." });
  } catch (err) {
    console.error("❌ Email error:", err);
    res.status(500).json({ message: "Failed to send email." });
  }
});

app.listen(port, () => {
  console.log(`🚀 Server listening on http://localhost:${port}`);
});