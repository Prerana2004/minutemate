const { google } = require("googleapis");
const credentials = require("./credentials.json");

async function createGoogleDoc(title, content) {
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/documents", "https://www.googleapis.com/auth/drive"],
  });

  const docs = google.docs({ version: "v1", auth: await auth.getClient() });

  const newDoc = await docs.documents.create({
    requestBody: { title },
  });

  await docs.documents.batchUpdate({
    documentId: newDoc.data.documentId,
    requestBody: {
      requests: [
        {
          insertText: {
            location: { index: 1 },
            text: content,
          },
        },
      ],
    },
  });

  return `https://docs.google.com/document/d/${newDoc.data.documentId}/edit`;
}

module.exports = { createGoogleDoc };
