const { google } = require("googleapis");

async function authorize() {
  const credentials = JSON.parse(process.env.GOOGLE_CREDS);

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: [
      "https://www.googleapis.com/auth/documents",
      "https://www.googleapis.com/auth/drive" // ✅ Required for moving file to folder
    ],
  });

  return await auth.getClient();
}

async function createGoogleDoc(summaryText) {
  const auth = await authorize();

  const docs = google.docs({ version: "v1", auth });
  const drive = google.drive({ version: "v3", auth });

  // 1. Create the Google Doc
  const document = await docs.documents.create({
    requestBody: {
      title: "MinuteMate Meeting Summary",
    },
  });

  const documentId = document.data.documentId;

  // 2. Move it to the shared folder
  await drive.files.update({
    fileId: documentId,
    addParents: '1_cPi3rK8f-rBFzcaUklDTTiWCOpyRsnJ', // ✅ Your folder ID
    fields: 'id, parents',
  });

  // 3. Write content to the doc
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
