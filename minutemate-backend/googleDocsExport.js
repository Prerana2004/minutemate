require("dotenv").config();
const fs = require("fs");
const { google } = require("googleapis");

/**
 * Creates a Google Doc with the provided summary text using OAuth2 tokens.
 * @param {string} summaryText - The text to insert into the Google Doc.
 * @param {object} tokens - The OAuth2 tokens obtained during Google login.
 */
async function createGoogleDoc(summaryText, tokens) {
  try {
    const oAuth2Client = new google.auth.OAuth2(
      process.env.CLIENT_ID,
      process.env.CLIENT_SECRET,
      `${process.env.BACKEND_URL}/auth/google/callback`
    );

    oAuth2Client.setCredentials(tokens);

    const docs = google.docs({ version: "v1", auth: oAuth2Client });
    const drive = google.drive({ version: "v3", auth: oAuth2Client });

    // Step 1: Create an empty Google Doc in the desired Drive folder
    const file = await drive.files.create({
      requestBody: {
        name: "MinuteMate Meeting Summary",
        mimeType: "application/vnd.google-apps.document",
        parents: ["1bLlV83fciizW18Knpecwfn9tu-F2l09m"], // Your shared folder ID
      },
      fields: "id",
    });

    const documentId = file.data.id;

    // Step 2: Insert text into the doc
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

    console.log("✅ Summary exported to Google Docs using OAuth2.");
    return `https://docs.google.com/document/d/${documentId}/edit`;
  } catch (err) {
    console.error("❌ Google Docs OAuth Export Error:", err.message);
    throw err;
  }
}

module.exports = { createGoogleDoc };
