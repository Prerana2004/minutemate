require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const ffmpeg = require("fluent-ffmpeg");
const axios = require("axios");
const mime = require("mime-types");
const nodemailer = require("nodemailer");
const path = require("path");
const session = require("express-session");
const { google } = require("googleapis");
const { createGoogleDoc } = require("./googleDocsExport");

const app = express();
const port = process.env.PORT || 5000;

app.use(cors({
  origin: "https://minutemate-lyart.vercel.app",
  methods: ["GET", "POST"],
  credentials: true
}));

app.use(session({
  secret: "minutemate_secret",
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

app.use(express.json());
const upload = multer({ dest: "uploads/" });

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

app.get("/auth/google", (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: [
      "https://www.googleapis.com/auth/documents",
      "https://www.googleapis.com/auth/drive.file",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile"
    ],
    prompt: "consent",
    client_id: process.env.GOOGLE_CLIENT_ID
  });
  res.redirect(authUrl);
});


app.get("/auth/google/callback", async (req, res) => {
  try {
    const { code } = req.query;
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const { data: userInfo } = await oauth2.userinfo.get();

    req.session.tokens = tokens;
    req.session.user = {
      email: userInfo.email,
      name: userInfo.name,
    };

    res.redirect(`https://minutemate-lyart.vercel.app?access_token=${tokens.access_token}&refresh_token=${tokens.refresh_token || ""}`);
  } catch (err) {
    console.error("OAuth Callback Error:", err);
    res.status(500).send("OAuth failed");
  }
});

function normalizeSentenceEnding(line) {
  return line.replace(/\.*$/, ".");
}

app.post("/transcribe-clean", upload.single("file"), async (req, res) => {
  const bearerHeader = req.headers.authorization;
  const accessToken = bearerHeader?.split(" ")[1];

  if (!accessToken && !req.session.tokens) {
    return res.status(401).json({ error: "User not authenticated. Please log in with Google." });
  }

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
        if (!rawTranscript) throw new Error("Empty response from Whisper API");

        const cleanedText = rawTranscript
          .replace(/\b(um|uh|like|you know)\b/gi, "")
          .replace(/\s{2,}/g, " ")
          .trim();

        const lines = cleanedText
          .replace(/([.?!])\s*(?=[A-Z])/g, "$1|")
          .split("|")
          .map(line => line.trim())
          .filter(line => line.length > 0);

        const titleLine = lines.find(line => /(welcome|meeting|planning)/i.test(line));
        const meetingTitle = titleLine || "Untitled Meeting";
        const date = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

        const keyPoints = lines.filter(l => l.length > 30).slice(0, 5).map(l => `• ${normalizeSentenceEnding(l)}`).join("\n") || "No key points found.";
        const decisions = lines.filter(l => /(decided|plan|agreed|schedule|finalize)/i.test(l)).map(l => `• ${normalizeSentenceEnding(l)}`).join("\n") || "No decisions identified.";
        const actionItems = lines.filter(l => /(will|shall|must|plan to)/i.test(l)).slice(0, 5).map(l => `• ${normalizeSentenceEnding(l)}`).join("\n") || "No action items identified.";

        const summary = `Meeting Summary\nTitle: ${meetingTitle}\nDate: ${date}\n\nKey Points:\n${keyPoints}\n\nDecisions:\n${decisions}\n\nAction Items:\n${actionItems}`;

        const googleDocUrl = await createGoogleDoc(summary, accessToken || req.session.tokens);

        fs.unlinkSync(audioPath);
        fs.unlinkSync(wavPath);

        res.json({ text: summary, docLink: googleDocUrl, rawTranscript });
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
      subject: "📜 Your Meeting Summary",
      text: `Here's your meeting summary.\n\nGoogle Doc: ${docLink}\n\n${summaryText}`,
      attachments: [
        { filename: "MeetingSummary.txt", path: filePath }
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
