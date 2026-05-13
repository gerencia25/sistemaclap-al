import { google } from "googleapis";

const credentials = JSON.parse(
  process.env.GOOGLE_SERVICE_ACCOUNT_JSON!
);

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: [
    "https://www.googleapis.com/auth/drive",
    "https://www.googleapis.com/auth/spreadsheets",
  ],
});

export const drive = google.drive({
  version: "v3",
  auth,
});

export const sheets = google.sheets({
  version: "v4",
  auth,
});