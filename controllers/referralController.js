const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");
const { PrismaClient } = require("@prisma/client");
const nodemailer = require("nodemailer");
require("dotenv").config();

const prisma = new PrismaClient();

const credentialsPath = path.join(__dirname, "..", "credentials.json");
const credentials = JSON.parse(fs.readFileSync(credentialsPath));

const { client_secret, client_id, redirect_uris, refresh_token } =
  credentials.web;
const oAuth2Client = new google.auth.OAuth2(
  client_id,
  client_secret,
  redirect_uris[0]
);

oAuth2Client.setCredentials({
  refresh_token: refresh_token,
});

// Function to refresh access token
async function refreshAccessTokenIfNeeded() {
  try {
    const { token } = await oAuth2Client.getAccessToken();
    oAuth2Client.setCredentials({
      access_token: token,
    });
  } catch (error) {
    console.error("Error refreshing access token:", error.message);
    throw error;
  }
}

// Function to send email
async function sendEmail(auth, mailOptions) {
  const gmail = google.gmail({ version: "v1", auth });
  try {
    await refreshAccessTokenIfNeeded(); 
    const response = await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: makeEmailBody(mailOptions),
      },
    });
    console.log("Email sent:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error sending email:", error.message);
    throw error;
  }
}

function makeEmailBody(mailOptions) {
  const email_lines = [];
  email_lines.push(`From: ${mailOptions.from}`);
  email_lines.push(`To: ${mailOptions.to}`);
  email_lines.push("Content-type: text/html;charset=iso-8859-1");
  email_lines.push(`Subject: ${mailOptions.subject}\n`);
  email_lines.push(`${mailOptions.text}`);

  return Buffer.from(email_lines.join("\n"))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

const createReferral = async (req, res) => {
  const { referrerName, referrerEmail, refereeName, refereeEmail } = req.body;
  try {
    console.log("Creating referral for:", {
      referrerName,
      referrerEmail,
      refereeName,
      refereeEmail,
    });

    await refreshAccessTokenIfNeeded(); 

    const newReferral = await prisma.referral.create({
      data: {
        referrerName,
        referrerEmail,
        refereeName,
        refereeEmail,
      },
    });

    console.log("New referral created:", newReferral);

    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: refereeEmail,
      subject: "You have been referred!",
      text: `Hi ${refereeName},\n\n${referrerName} has referred you to our platform. Join us and start learning today!\n\nBest Regards,\nAccredian`,
    };

    await sendEmail(oAuth2Client, mailOptions);

    res.status(201).json(newReferral);
  } catch (error) {
    console.error("Error creating referral:", error);
    res.status(500).json({ error: "Failed to create referral" });
  }
};

module.exports = { createReferral };
