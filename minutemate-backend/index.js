const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const ffmpeg = require("fluent-ffmpeg");
const axios = require("axios");
const dotenv = require("dotenv");
const mime = require("mime-types");
const nodemailer = require("nodemailer");
const path = require("path");
const { createGoogleDoc } = require("./googleDocsExport");

dotenv.config();

const app = express();
const port = 5000;

app.use(cors({
  origin: "https://minutemate-lyart.vercel.app",
  methods: ["GET", "POST"],
  credentials: true
}));

app.use(express.json());
const upload = multer({ dest: "uploads/" });

function normalizeSentenceEnding(line) {
  return line.replace(/\.*$/, ".");
}

app.post("/transcribe-clean", upload.single("file"), (req, res) => {
  console.log("🟢 Request received at /transcribe-clean");
  const audioPath = req.file.path;

  const validMimeTypes = ["audio/webm", "audio/mpeg", "audio/weba"];
  if (!validMimeTypes.includes(req.file.mimetype)) {
    fs.unlinkSync(audioPath);
    return res.status(400).json({ error: "Only .mp3 or .webm audio files are supported." });
  }

  const wavPath = `${audioPath}.wav`;

  ffmpeg(audioPath)
    .toFormat("wav")
    .save(wavPath)
    .on("end", async () => {
      try {
        console.log("✅ Audio converted. Sending to Hugging Face...");
        const audioBuffer = fs.readFileSync(wavPath);
        const contentType = mime.lookup(wavPath) || "application/octet-stream";

        const response = await axios.post(
          "https://api-inference.huggingface.co/models/openai/whisper-large-v3",
          audioBuffer,
          {
            headers: {
              Authorization: `Bearer ${process.env.HF_TOKEN}`,
              "Content-Type": contentType,
              Accept: "application/json"
            },
            timeout: 300000
          }
        );

        const rawTranscript = response.data.text;
        console.log("✅ HF API Success:", rawTranscript);
        if (!rawTranscript) throw new Error("Empty response from Whisper API");

        const withoutTimestamps = rawTranscript.replace(/\[\d{2}:\d{2}\.\d{3} --> \d{2}:\d{2}\.\d{3}\]/g, "");
        const cleanedText = withoutTimestamps
          .replace(/\b(um|uh|like|you know)\b/gi, "")
          .replace(/\s{2,}/g, " ")
          .trim();

        const lines = cleanedText
          .replace(/([.?!])\s*(?=[A-Z])/g, "$1|")
          .split("|")
          .map(line => line.trim())
          .filter(line => line.length > 0);

        const titleLine = lines.find(line => /(welcome|meeting|planning)/i.test(line) && line.toLowerCase().includes("meeting"));
        const meetingTitle = titleLine ? titleLine.replace(/^welcome to\s+/i, "").trim() : "Untitled Meeting";

        const date = new Date().toLocaleDateString("en-IN", {
          day: "numeric", month: "long", year: "numeric"
        });

        const participantMatches = cleanedText.match(/\b(I am|This is|My name is|[A-Z][a-z]+ here)\b.*?\b([A-Z][a-z]+)\b/gi);
        const participantNames = participantMatches
          ? participantMatches.map(p => p.split(" ").slice(-1)[0]).join(", ")
          : null;

        const ignorePhrases = ["welcome", "hello", "hi", "i am", "this is", "thank you", "everyone", "good morning"];
        const keyPointsFiltered = lines.filter(line => {
          const lc = line.toLowerCase();
          return !ignorePhrases.some(phrase => lc.includes(phrase)) && line.length > 20 && !/\b(i am|this is)\b/i.test(line);
        }).slice(0, 5);

        const keyPoints = keyPointsFiltered.length
          ? keyPointsFiltered.map(line => `• ${normalizeSentenceEnding(line.trim())}`).join("\n")
          : "No key points mentioned.";

        const decisionIndicators = [
          "decided", "we will", "we shall", "we plan", "scheduled", "finalized",
          "going to", "agreed", "will be", "next step is", "our plan is", "we decided", "the decision",
          "we have decided", "it was decided"
        ];

        const summarizedDecisionsLines = lines.filter(line => {
          const lc = line.toLowerCase();
          return decisionIndicators.some(ind => lc.includes(ind)) && !lc.includes("welcome") && !lc.includes("i am") && !lc.includes("thank you");
        });

        const summarizedDecisions = summarizedDecisionsLines.length
          ? summarizedDecisionsLines.map(line => `• ${normalizeSentenceEnding(line.trim())}`).join("\n")
          : "No clear decisions mentioned.";

        const actionItemRegex = /\b(will|need to|going to|have to|must|shall|plan to|next step is)\b/i;
        const deadlineRegex = /\b(by|on|before|after)\s+((next\s+)?(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)|\d{1,2}(st|nd|rd|th)?\s+\w+|next week|tomorrow|today|this week|end of day)\b/i;

        const actionItems = [];
        lines.forEach(line => {
          const lc = line.toLowerCase();
          if (line.split(" ").length > 30) return;

          if (actionItemRegex.test(lc)) {
            let responsible = "Someone";

            if (/^i\b/i.test(line)) {
              responsible = participantNames || "Someone";
            } else {
              const nameMatch = line.match(/\b([A-Z][a-z]+)\s+(will|shall|must|needs to|has to)\b/);
              if (nameMatch) responsible = nameMatch[1];
            }

            const deadlineMatch = line.match(deadlineRegex);
            const deadline = deadlineMatch ? deadlineMatch[0] : null;

            actionItems.push(`• ${normalizeSentenceEnding(line.trim())} — Responsible: ${responsible}${deadline ? `, Deadline: ${deadline}` : ""}`);
          }
        });

        const output = `Meeting Summary\nTitle: ${meetingTitle}\nDate: ${date}\n${participantNames ? `Participants: ${participantNames}` : ""}\n\nKey Points:\n${keyPoints}\n\nDecisions:\n${summarizedDecisions}\n\nAction Items:\n${actionItems.length ? actionItems.join("\n") : "No clear action items mentioned."}`;

        const tagKeywords = ["deadline", "follow-up", "ASAP", "urgent", "action", "task", "important"];
        const taggedOutput = output.replace(
          new RegExp(`\\b(${tagKeywords.join("|")})\\b`, "gi"),
          match => `#${match}`
        );

        const googleDocUrl = await createGoogleDoc(taggedOutput);

        fs.unlinkSync(audioPath);
        fs.unlinkSync(wavPath);

        res.json({
          text: taggedOutput,
          docLink: googleDocUrl,
          pdfLink: null,
          txtLink: null
        });

      } catch (err) {
        console.error("❌ Processing Error:", err.message);
        fs.unlinkSync(audioPath);
        fs.unlinkSync(wavPath);
        res.status(500).json({ error: "Failed to transcribe or process." });
      }
    })
    .on("error", (err) => {
      console.error("❌ FFmpeg Error:", err.message);
      res.status(500).json({ error: "Audio conversion failed." });
    });
});

app.post("/send-summary", async (req, res) => {
  const { email, summaryText, docLink } = req.body;
  if (!email || !summaryText || !docLink) {
    return res.status(400).json({ message: "Missing email, summary, or doc link." });
  }

  try {
    const filePath = path.join(__dirname, "temp-summary.txt");
    fs.writeFileSync(filePath, summaryText, "utf8");

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    await transporter.sendMail({
      from: `MinuteMate Bot <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "📝 Your Meeting Summary",
      text: `Here's your meeting summary.\n\nGoogle Doc: ${docLink}\n\n${summaryText}`,
      attachments: [
        {
          filename: "MeetingSummary.txt",
          path: filePath
        }
      ]
    });

    fs.unlinkSync(filePath);
    res.json({ message: "✅ Summary sent with Google Doc and .txt attached." });
  } catch (err) {
    console.error("❌ Email Send Error:", err);
    res.status(500).json({ message: "Failed to send email." });
  }
});

app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
});