const fs = require("fs");
const { google } = require("googleapis");

async function authorize() {
  const credentials = JSON.parse(process.env.GOOGLE_CREDS);

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: [
      "https://www.googleapis.com/auth/documents",
      "https://www.googleapis.com/auth/drive", // Needed for moving file
    ],
  });

  return await auth.getClient();
}

async function createGoogleDoc(summaryText) {
  const auth = await authorize();
  const docs = google.docs({ version: "v1", auth });
  const drive = google.drive({ version: "v3", auth });

  // Step 1: Create the doc
  const document = await docs.documents.create({
    requestBody: {
      title: "MinuteMate Meeting Summary",
    },
  });

  const documentId = document.data.documentId;

  // Step 2: Move it to shared folder
  console.log("🔁 Moving doc to Drive folder...");
  try {
    await drive.files.update({
      fileId: documentId,
      addParents: "1_cPi3rK8f-rBFzcaUklDTTiWCOpyRsnJ", // ✅ Your folder ID
    });
    console.log("✅ Moved doc to folder");
  } catch (err) {
    console.error("❌ Failed to move doc to folder:", err.message);
    throw err;
  }

  // Step 3: Add content
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
