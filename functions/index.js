const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

admin.initializeApp();

// Configure your email transporter
// NOTE: You will need to generate an "App Password" from your Google Account settings 
// and replace "YOUR_APP_PASSWORD" below for this to actually send emails.
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "mdhusdhndegree@gmail.com",
    pass: "znux xnmo oesz yfrm" 
  }
});

// 1. DAILY REMINDER: Runs every day at 21:00 (9 PM) IST
exports.dailyExpenseReminder = functions.pubsub
  .schedule("0 21 * * *")
  .timeZone("Asia/Kolkata")
.onRun(async () => {    
    const mailOptions = {
      from: '"FinTracker Pro" <mdhusdhndegree@gmail.com>',
      to: "mdhusdhndegree@gmail.com",
      subject: "⏱️ Time to log today's expenses!",
      html: `
        <h2>Good Evening!</h2>
        <p>Did you spend any money today? Take 30 seconds to log it in your dashboard so you don't forget!</p>
      `
    };

    await transporter.sendMail(mailOptions);
    return null;
  });

// 2. MONTHLY REPORT: Runs on the 1st of every month at 8:00 AM IST
exports.monthlyReport = functions.pubsub
  .schedule("0 8 1 * *")
  .timeZone("Asia/Kolkata")
  .onRun(async (context) => {
    
    const mailOptions = {
      from: '"FinTracker Pro" <mdhusdhndegree@gmail.com>',
      to: "mdhusdhndegree@gmail.com",
      subject: "📊 Your Monthly Financial Report is Ready",
      html: `
        <h2>Monthly Summary</h2>
        <p>Your expenses have been tallied for last month. Check out your dashboard to see your AI insights and category breakdown.</p>
      `
    };

    await transporter.sendMail(mailOptions);
    return null;
  });