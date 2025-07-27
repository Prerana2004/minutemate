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

// ✅ List files to debug Drive quota and ownership
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

  // 🔁 Optional: Delete old files if needed to free up quota
  /*
  if (res.data.files.length > 90) {
    const oldest = res.data.files.sort((a, b) => new Date(a.createdTime) - new Date(b.createdTime))[0];
    await drive.files.delete({ fileId: oldest.id });
    console.log(`🗑 Deleted oldest file: ${oldest.name}`);
  }
  */
}

// 📝 Create the Google Doc
async function createGoogleDoc(summaryText) {
  const auth = await authorize();
  const docs = google.docs({ version: "v1", auth });
  const drive = google.drive({ version: "v3", auth });

  // 🔍 Debug Drive files owned by this service account
  await listFilesOwnedByServiceAccount(auth);

  // ✅ Create the doc (in service account's root Drive)
  const file = await drive.files.create({
    requestBody: {
      name: "MinuteMate Meeting Summary",
      mimeType: "application/vnd.google-apps.document",
    },
  });

  const documentId = file.data.id;

  // ✏️ Insert summary into the doc
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
