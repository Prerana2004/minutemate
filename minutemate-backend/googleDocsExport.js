const fs = require("fs");
const { google } = require("googleapis");

async function authorize() {
  const credentials = JSON.parse(process.env.GOOGLE_CREDS);

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: [
      "https://www.googleapis.com/auth/documents",
      "https://www.googleapis.com/auth/drive",
    ],
  });

  return await auth.getClient();
}

async function createGoogleDoc(summaryText) {
  const auth = await authorize();
  const drive = google.drive({ version: "v3", auth });
  const docs = google.docs({ version: "v1", auth });

  // ✅ Step 1: Create the document directly inside the folder
  const file = await drive.files.create({
    requestBody: {
      name: "MinuteMate Meeting Summary",
      mimeType: "application/vnd.google-apps.document",
      parents: ["1_cPi3rK8f-rBFzcaUklDTTiWCOpyRsnJ"], // Folder ID
    },
  });

  const documentId = file.data.id;

  // ✅ Step 2: Insert the summary content
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

  console.log("✅ Summary exported to Google Docs.");
  return `https://docs.google.com/document/d/${documentId}/edit`;
}

module.exports = { createGoogleDoc };
