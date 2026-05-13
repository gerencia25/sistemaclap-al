import { google } from "googleapis";
import path from "path";

const auth = new google.auth.GoogleAuth({
  keyFile: path.join(process.cwd(), "secrets/google-service-account.json"),
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