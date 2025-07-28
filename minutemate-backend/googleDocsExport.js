const { google } = require("googleapis");

const createGoogleDoc = async (title, content) => {
  try {
    const creds = JSON.parse(process.env.GOOGLE_CREDS);
    creds.private_key = creds.private_key.replace(/\\n/g, '\n'); // Fix newline issues

    const auth = new google.auth.GoogleAuth({
      credentials: creds,
      scopes: [
        "https://www.googleapis.com/auth/documents",
        "https://www.googleapis.com/auth/drive",
      ],
    });

    const authClient = await auth.getClient();

    const docs = google.docs({ version: "v1", auth: authClient });
    const drive = google.drive({ version: "v3", auth: authClient });

    const folderId = "1bLlV83fciizW18Knpecwfn9tu-F2l09m"; // ✅ Your shared folder ID

    // Step 1: Create Google Doc
    const fileMetadata = {
      name: title,
      mimeType: "application/vnd.google-apps.document",
      parents: [folderId], // ✅ MUST be an array
    };

    const docFile = await drive.files.create({
      resource: fileMetadata,
      fields: "id",
    });

    const documentId = docFile.data.id;

    // Step 2: Insert text content
    await docs.documents.batchUpdate({
      documentId,
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

    console.log("✅ Google Doc created successfully.");
    return `https://docs.google.com/document/d/${documentId}/edit`;

  } catch (error) {
    console.error("❌ Google Docs API Error:", error.message);
    throw error;
  }
};

module.exports = { createGoogleDoc };
