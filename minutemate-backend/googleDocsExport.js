const fs = require("fs");
const { google } = require("googleapis");

/**
 * Authorizes the service account using credentials from environment variable.
 */
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

/**
 * Lists files owned by the service account — helpful to debug storage/quota issues.
 */
async function listFilesOwnedByServiceAccount(auth) {
  try {
    const drive = google.drive({ version: "v3", auth });

    const res = await drive.files.list({
      q: "'me' in owners",
      fields: "files(id, name, size, createdTime)",
      pageSize: 100,
    });

    if (res.data.files.length === 0) {
      console.log("📂 No files owned by the service account.");
    } else {
      console.log("📂 Files owned by the service account:");
      res.data.files.forEach(file => {
        const size = file.size ? `${(file.size / 1024).toFixed(2)} KB` : "Unknown";
        console.log(`- ${file.name} (ID: ${file.id}, Size: ${size})`);
      });
    }
  } catch (err) {
    console.error("⚠️ Failed to list files:", err.message);
  }
}

/**
 * Creates a Google Doc with the provided summary text.
 */
async function createGoogleDoc(summaryText) {
  try {
    const auth = await authorize();
    const docs = google.docs({ version: "v1", auth });
    const drive = google.drive({ version: "v3", auth });

    // Optional: List owned files to debug quota
    await listFilesOwnedByServiceAccount(auth);

    // Step 1: Create an empty Google Doc
    const file = await drive.files.create({
  requestBody: {
    name: "MinuteMate Meeting Summary",
    mimeType: "application/vnd.google-apps.document",
    parents: ["1AbCDeFgHiJKlMNopQRsTuvWxYZ"], 
  },
});


    const documentId = file.data.id;

    // Step 2: Insert the text content into the doc
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
  } catch (err) {
    console.error("❌ Google Docs Export Error:", err.message);
    throw err;
  }
}

module.exports = { createGoogleDoc };
