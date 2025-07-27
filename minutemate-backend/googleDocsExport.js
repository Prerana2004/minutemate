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

// ✅ ADD THIS FUNCTION TO LIST FILES OWNED BY SERVICE ACCOUNT
async function listFilesOwnedByServiceAccount(auth) {
  const drive = google.drive({ version: "v3", auth });

  const res = await drive.files.list({
    q: "'me' in owners",
    fields: "files(id, name, size, createdTime)",
    pageSize: 100,
  });

  console.log("📂 Files owned by the service account:");
  res.data.files.forEach(file => {
    const size = file.size ? `${(file.size / 1024).toFixed(2)} KB` : "Unknown";
    console.log(`- ${file.name} (ID: ${file.id}, Size: ${size})`);
  });
}

// 📝 MAIN FUNCTION TO CREATE GOOGLE DOC
async function createGoogleDoc(summaryText) {
  const auth = await authorize();
  const docs = google.docs({ version: "v1", auth });
  const drive = google.drive({ version: "v3", auth });

  // 🔍 Call this before creating doc to debug quota
  await listFilesOwnedByServiceAccount(auth);

  // Step 1: Create the doc
  // Do NOT set the parent folder
  const file = await drive.files.create({
    requestBody: {
      name: "MinuteMate Meeting Summary",
      mimeType: "application/vnd.google-apps.document",
    },
  });

  const documentId = file.data.id;

  // Step 2: Add content
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
