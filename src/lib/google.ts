import { google } from "googleapis";
import path from "path";

const scopes = [
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/spreadsheets",
];

const auth = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  ? new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON),
      scopes,
    })
  : new google.auth.GoogleAuth({
      keyFile: path.join(process.cwd(), "secrets/google-service-account.json"),
      scopes,
    });

export const drive = google.drive({
  version: "v3",
  auth,
});

export const sheets = google.sheets({
  version: "v4",
  auth,
});