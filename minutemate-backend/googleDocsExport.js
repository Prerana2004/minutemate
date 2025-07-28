const { google } = require("googleapis");
const { GoogleAuth } = require("google-auth-library");

async function createGoogleDoc(summaryText) {
  // Parse the GOOGLE_CREDS JSON string from env
  const credentials = JSON.parse(process.env.GOOGLE_CREDS);

  const auth = new GoogleAuth({
    credentials, // ✅ pass parsed credentials here
    scopes: [
      "https://www.googleapis.com/auth/documents",
      "https://www.googleapis.com/auth/drive.file"
    ],
  });

  const client = await auth.getClient();
  const docs = google.docs({ version: "v1", auth: client });

  const title = "Meeting Summary - " + new Date().toLocaleString();

  const doc = await docs.documents.create({
    requestBody: { title },
  });

  const documentId = doc.data.documentId;

  await docs.documents.batchUpdate({
    documentId,
    requestBody: {
      requests: [
        {
          insertText: {
            location: { index: 1 },
            text: summaryText,
          },
        },
      ],
    },
  });

  return `https://docs.google.com/document/d/${documentId}/edit`;
}

module.exports = { createGoogleDoc };
