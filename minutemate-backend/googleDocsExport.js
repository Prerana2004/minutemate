const { google } = require("googleapis");
const { GoogleAuth } = require("google-auth-library");

const createGoogleDoc = async (title, content) => {
  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT),
    scopes: [
      "https://www.googleapis.com/auth/documents",
      "https://www.googleapis.com/auth/drive",
    ],
  });

  const authClient = await auth.getClient();

  const docs = google.docs({ version: "v1", auth: authClient });
  const drive = google.drive({ version: "v3", auth: authClient });

  const folderId = "1bLlV83fciizW18Knpecwfn9tu-F2l09m"; // 👈 Your shared folder

  // Step 1: Create the Google Doc
  const docResponse = await docs.documents.create({
    requestBody: {
      title: title,
    },
  });

  const documentId = docResponse.data.documentId;

  // Step 2: Move it into the shared folder
  await drive.files.update({
    fileId: documentId,
    addParents: folderId,
    removeParents: "root",
    fields: "id, parents",
  });

  // Step 3: Add content
  await docs.documents.batchUpdate({
    documentId: documentId,
    requestBody: {
      requests: [
        {
          insertText: {
            location: {
              index: 1,
            },
            text: content,
          },
        },
      ],
    },
  });

  return `https://docs.google.com/document/d/${documentId}/edit`;
};
module.exports = { createGoogleDoc };
