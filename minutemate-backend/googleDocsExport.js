const fs = require("fs");
const { google } = require("googleapis");
const open = (...args) => import('open').then(module => module.default(...args));

const SCOPES = ["https://www.googleapis.com/auth/documents"];
const CREDENTIALS_PATH = "credentials.json"; // Download from Google Cloud
const TOKEN_PATH = "token.json"; // Will be created on first auth

function loadCredentials() {
  return JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
}

async function authorize() {
  const credentials = loadCredentials();
  const { client_id, client_secret, redirect_uris } = credentials.web; // ✅ updated here
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  // Load token if exists
  if (fs.existsSync(TOKEN_PATH)) {
    oAuth2Client.setCredentials(JSON.parse(fs.readFileSync(TOKEN_PATH)));
    return oAuth2Client;
  }

  // Else request user consent
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
  });

  console.log("Authorize this app by visiting this URL:", authUrl);
  await open(authUrl);

  const readline = require("readline").createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const code = await new Promise((resolve) => {
    readline.question("Enter the code from that page here: ", (code) => {
      readline.close();
      resolve(code);
    });
  });

  const { tokens } = await oAuth2Client.getToken(code);
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
  console.log("✅ Token file created at:", TOKEN_PATH); // ✅ your requested log
  oAuth2Client.setCredentials(tokens);
  return oAuth2Client;
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
