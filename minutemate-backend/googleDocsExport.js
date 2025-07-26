const fs = require("fs");
const { google } = require("googleapis");

async function authorize() {
  const credentials = JSON.parse(fs.readFileSync("credentials.json"));

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/documents"],
  });

  return await auth.getClient();
}

async function createGoogleDoc(summaryText) {
  const auth = await authorize();
  const docs = google.docs({ version: "v1", auth });

  const document = await docs.documents.create({
    requestBody: {
      title: "MinuteMate Meeting Summary",
    },
  });

  const documentId = document.data.documentId;

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
