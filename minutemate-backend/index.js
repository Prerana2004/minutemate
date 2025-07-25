const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { exec } = require("child_process");
const fs = require("fs");
const ffmpeg = require("fluent-ffmpeg");
const { createGoogleDoc } = require("./googleDocsExport");


const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());
const upload = multer({ dest: "uploads/" });

function normalizeSentenceEnding(line) {
  return line.replace(/\.*$/, "."); // Replaces all trailing dots with one single `.`
}


app.post("/transcribe-clean", upload.single("file"), (req, res) => {
  const audioPath = req.file.path;

  const validMimeTypes = ["audio/webm", "audio/mpeg"];

if (!validMimeTypes.includes(req.file.mimetype)) {
  fs.unlinkSync(audioPath);
  return res.status(400).json({ error: "Only .mp3 or .webm audio files are supported." });
}

  
  const wavPath = `${audioPath}.wav`;

  ffmpeg(audioPath)
    .toFormat("wav")
    .save(wavPath)
    .on("end", () => {
      const command = `python -m whisper ${wavPath} --language English --fp16 False`;

      exec(command, { maxBuffer: 1024 * 5000 }, async (error, stdout, stderr) => {
        if (error) {
          console.error("❌ Whisper Error:", error.message);
          fs.unlinkSync(audioPath);
          fs.unlinkSync(wavPath);
          return res.status(500).json({ error: "Whisper failed." });
        }

        try {
          const rawTranscript = stdout.trim();
          const withoutTimestamps = rawTranscript.replace(/\[\d{2}:\d{2}\.\d{3} --> \d{2}:\d{2}\.\d{3}\]/g, "");
          const cleanedText = withoutTimestamps
            .replace(/\b(um|uh|like|you know)\b/gi, "")
            .replace(/\s{2,}/g, " ")
            .trim();

          const lines = cleanedText
          .replace(/([.?!])\s*(?=[A-Z])/g, "$1|")  // insert delimiter after sentence end
          .split("|")
          .map(line => line.trim())
          .filter(line => line.length > 0);

          const titleLine = lines.find(line =>
            /(welcome|meeting|planning)/i.test(line) && line.toLowerCase().includes("meeting")
          );

          const meetingTitle = titleLine ? titleLine.replace(/^welcome to\s+/i, "").trim() : "Untitled Meeting";


          const date = new Date().toLocaleDateString("en-IN", {
            day: "numeric",
            month: "long",
            year: "numeric"
          });

          const participantMatches = cleanedText.match(/\b(I am|This is|My name is|[A-Z][a-z]+ here)\b.*?\b([A-Z][a-z]+)\b/gi);
          const participantNames = participantMatches
            ? participantMatches.map(p => p.split(" ").slice(-1)[0]).join(", ")
            : null;

          const ignorePhrases = [
            "welcome", "hello", "hi", "i am", "this is", "thank you", "everyone", "good morning"
          ];

          const keyPointsFiltered = lines.filter(line => {
            const lc = line.toLowerCase();
            return !ignorePhrases.some(phrase => lc.includes(phrase)) &&
              line.length > 20 &&
              !/\b(i am|this is)\b/i.test(line);
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
            const isDecision = decisionIndicators.some(ind => lc.includes(ind));
            const isNoise = lc.includes("welcome") || lc.includes("i am") || lc.includes("thank you");
            return isDecision && !isNoise;
          });

          const summarizedDecisions = summarizedDecisionsLines.length
            ? summarizedDecisionsLines.map(line => `• ${normalizeSentenceEnding(line.trim())}`).join("\n")
            : "No clear decisions mentioned.";


          const actionItemRegex = /\b(will|need to|going to|have to|must|shall|plan to|next step is)\b/i;
          const deadlineRegex = /\b(by|on|before|after)\s+((next\s+)?(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)|\d{1,2}(st|nd|rd|th)?\s+\w+|next week|tomorrow|today|this week|end of day)\b/i;

          const actionItems = [];

          lines.forEach(line => {
            const lc = line.toLowerCase();
            if (line.split(" ").length > 30) return; // Skip overly long sentences

            if (actionItemRegex.test(lc)) {
              let responsible = "Someone";

              if (/^i\b/i.test(line)) {
                responsible = participantNames || "Someone";
              } else {
                const nameMatch = line.match(/\b([A-Z][a-z]+)\s+(will|shall|must|needs to|has to)\b/);
                if (nameMatch) {
                  responsible = nameMatch[1];
                }
              }

              const deadlineMatch = line.match(deadlineRegex);
              const deadline = deadlineMatch ? deadlineMatch[0] : null;

              const formatted = `• ${normalizeSentenceEnding(line.trim())} — Responsible: ${responsible}${deadline ? `, Deadline: ${deadline}` : ""}`;
              actionItems.push(formatted);
            }
          });

          const output = `Meeting Summary
Title: ${meetingTitle}
Date: ${date}
${participantNames ? `Participants: ${participantNames}` : ""}

Key Points:
${keyPoints}

Decisions:
${summarizedDecisions}

Action Items:
${actionItems.length ? actionItems.join("\n") : "No clear action items mentioned."}
`;

          // ✅ Add keyword tagging
          const tagKeywords = ["deadline", "follow-up", "ASAP", "urgent", "action", "task", "important"];
          const taggedOutput = output.replace(
            new RegExp(`\\b(${tagKeywords.join("|")})\\b`, "gi"),
            (match) => `#${match}`
          );

          const googleDocUrl = await createGoogleDoc(taggedOutput); // optional

          fs.unlinkSync(audioPath);
          fs.unlinkSync(wavPath);

          // You can add real PDF or TXT export logic if needed
          const pdfLink = null; // Add link generation logic if needed
          const txtLink = null; // Add link generation logic if needed

          return res.json({
            text: taggedOutput,
            docLink: googleDocUrl,
            pdfLink,
            txtLink
          });

        } catch (err) {
          console.error("❌ Processing Error:", err);
          fs.unlinkSync(audioPath);
          fs.unlinkSync(wavPath);
          return res.status(500).json({ error: "Internal processing failed." });
        }
      });
    })
    .on("error", (err) => {
      console.error("❌ FFmpeg Error:", err.message);
      return res.status(500).json({ error: "Audio conversion failed." });
    });
});

app.listen(port, () => {
  console.log(`🚀 Local backend with improved summarizer running at http://localhost:${port}`);
});
