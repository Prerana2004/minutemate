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
    // ✅ Debug: Log client ID
    console.log("DEBUG: CLIENT_ID =", process.env.CLIENT_ID);
    console.log("DEBUG: BACKEND_URL =", process.env.BACKEND_URL);

    if (!process.env.CLIENT_ID || !process.env.CLIENT_SECRET || !process.env.BACKEND_URL) {
      throw new Error("Missing environment variables. Check CLIENT_ID, CLIENT_SECRET, BACKEND_URL.");
    }

    const oAuth2Client = new google.auth.OAuth2(
      process.env.CLIENT_ID,
      process.env.CLIENT_SECRET,
      `${process.env.BACKEND_URL}/auth/google/callback`
    );

    oAuth2Client.setCredentials(tokens);

    const docs = google.docs({ version: "v1", auth: oAuth2Client });
    const drive = google.drive({ version: "v3", auth: oAuth2Client });

    // Step 1: Create a new Google Doc in the shared folder
    const file = await drive.files.create({
      requestBody: {
        name: "MinuteMate Meeting Summary",
        mimeType: "application/vnd.google-apps.document",
        parents: ["1bLlV83fciizW18Knpecwfn9tu-F2l09m"], // Replace with your shared folder ID
      },
      fields: "id",
    });

    const documentId = file.data.id;

    // Step 2: Insert summary text into the doc
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
    console.error(err); // 🔍 Print full error
    throw err;
  }
}

module.exports = { createGoogleDoc };
