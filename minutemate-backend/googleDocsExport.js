const { google } = require("googleapis");
const { Readable } = require("stream");

// 👇 Step 1: Load credentials from env
let credentials;

try {
  credentials = JSON.parse(process.env.GOOGLE_CREDS);
  console.log("✅ Google credentials loaded from environment");
} catch (err) {
  console.error("❌ Failed to parse GOOGLE_CREDS:", err);
  process.exit(1);
}

// 👇 Step 2: Auth setup
const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ["https://www.googleapis.com/auth/drive", "https://www.googleapis.com/auth/documents"],
});

const docs = google.docs({ version: "v1", auth });
const drive = google.drive({ version: "v3", auth });

// 👇 Export function (your actual logic here)
async function exportToGoogleDocs(textContent) {
  // Create new doc
  const doc = await docs.documents.create({
    requestBody: {
      title: `MinuteMate Export - ${new Date().toISOString()}`,
    },
  });

  const documentId = doc.data.documentId;

  // Insert text
  await docs.documents.batchUpdate({
    documentId,
    requestBody: {
      requests: [
        {
          insertText: {
            text: textContent,
            location: { index: 1 },
          },
        },
      ],
    },
  });

  return `https://docs.google.com/document/d/${documentId}/edit`;
}

module.exports = { exportToGoogleDocs };
