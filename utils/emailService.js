const nodemailer = require("nodemailer");
const { BrevoClient } = require("@getbrevo/brevo");
const dns = require("dns");

dns.setDefaultResultOrder("ipv4first");

const getLoginBaseUrl = () => {
  return (
    process.env.CORS_URL || process.env.LOCAL_URL || "http://localhost:5173"
  );
};

const formatDate = (value) => {
  if (!value) return "Not specified";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

// ============================================================================
// EMAIL LOGIC (Unchanged)
// ============================================================================

const normalizeRecipients = (recipients) => {
  if (!recipients) return [];
  if (Array.isArray(recipients)) {
    return recipients
      .map((recipient) => {
        if (typeof recipient === "string") return { email: recipient, name: "Student" };
        if (recipient && recipient.email) return { email: recipient.email, name: recipient.name || "Student" };
        return null;
      })
      .filter(Boolean);
  }
  if (typeof recipients === "string") return [{ email: recipients, name: "Student" }];
  if (recipients.email) return [{ email: recipients.email, name: recipients.name || "Student" }];
  return [];
};

const buildWelcomeEmailHtml = ({ name, email, role, password }) => `
  <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
    <h2 style="color: #db2777;">Welcome to the ALAB System, ${name}!</h2>
    <p>An administrator has securely generated an account for you.</p>
    <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 5px 0;"><strong>System Role:</strong> ${role}</p>
      <p style="margin: 5px 0;"><strong>Login Email:</strong> ${email}</p>
      <p style="margin: 5px 0;"><strong>Temporary Password:</strong> <span style="font-family: monospace; background: #e5e7eb; padding: 2px 6px; border-radius: 4px;">${password}</span></p>
    </div>
    <p>Please log in at your earliest convenience. We highly recommend updating your password upon your first login.</p>
    <a href="${getLoginBaseUrl()}/login" style="display: inline-block; background-color: #db2777; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 10px;">Log in to ALAB</a>
  </div>
`;

const sendEmail = async ({ to, subject, html, fromName = "ALAB System Admin" }) => {
  const recipients = normalizeRecipients(to);
  if (!recipients.length) return { sent: false, skipped: true, provider: "none", count: 0 };
  if (!process.env.BREVO_API_KEY) {
    console.warn("Email skipped: BREVO_API_KEY is not configured.");
    return { sent: false, skipped: true, provider: "none", count: recipients.length };
  }
  const brevo = new BrevoClient({ apiKey: process.env.BREVO_API_KEY });
  const senderEmail = process.env.EMAIL_FROM || "no-reply@alab.local";
  try {
    await brevo.transactionalEmails.sendTransacEmail({
      subject,
      htmlContent: html,
      sender: { name: fromName, email: senderEmail },
      to: recipients.map(({ email, name }) => ({ email, name })),
    });
    return { sent: true, provider: "brevo", count: recipients.length };
  } catch (error) {
    console.error("Brevo Email Error:", error);
    return { sent: false, error: error.message };
  }
};

const sendWelcomeEmail = async ({ name, email, role, password }) => {
  return sendEmail({ to: [{ email, name }], subject: "Welcome to ALAB - Your Login Credentials", html: buildWelcomeEmailHtml({ name, email, role, password }) });
};

const sendAssignmentNotification = async ({ recipients, title, dueDate, section, facultyName }) => {
  const dueLine = dueDate ? `<p><strong>Due Date:</strong> ${formatDate(dueDate)}</p>` : "";
  return sendEmail({
    to: recipients,
    subject: `New ALAB activity: ${title}`,
    html: `<div style="font-family: Arial, sans-serif; padding: 20px; color: #333;"><h2 style="color: #db2777;">New Activity Posted</h2><p>Hello,</p><p><strong>${facultyName}</strong> has posted a new activity for <strong>${section}</strong>.</p><div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;"><p style="margin: 5px 0;"><strong>Activity:</strong> ${title}</p>${dueLine}</div><p>Please check your ALAB dashboard for the latest instructions and requirements.</p></div>`,
  });
};

const sendSessionNotification = async ({ recipients, facultyName, section, reservationDate, startTime, endTime }) => {
  return sendEmail({
    to: recipients,
    subject: `New lab session scheduled for ${section}`,
    html: `<div style="font-family: Arial, sans-serif; padding: 20px; color: #333;"><h2 style="color: #db2777;">Lab Session Scheduled</h2><p>Hello,</p><p><strong>${facultyName}</strong> has scheduled a new lab session for <strong>${section}</strong>.</p><div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;"><p style="margin: 5px 0;"><strong>Date:</strong> ${formatDate(reservationDate)}</p><p style="margin: 5px 0;"><strong>Time:</strong> ${startTime} - ${endTime}</p></div><p>Please review the session details in the ALAB system.</p></div>`,
  });
};

const sendMaterialNotification = async ({ recipients, title, section, uploadedBy, description }) => {
  return sendEmail({
    to: recipients,
    subject: `New learning material posted: ${title}`,
    html: `<div style="font-family: Arial, sans-serif; padding: 20px; color: #333;"><h2 style="color: #db2777;">New Learning Material</h2><p>Hello,</p><p>A new material has been posted for <strong>${section}</strong> by <strong>${uploadedBy}</strong>.</p><div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;"><p style="margin: 5px 0;"><strong>Title:</strong> ${title}</p><p style="margin: 5px 0;"><strong>Description:</strong> ${description || "No description provided."}</p></div><p>Please open your ALAB materials section to review it.</p></div>`,
  });
};

const sendRequestStatusNotification = async ({ recipients, itemName, status, studentName, details }) => {
  const actionText = status === "APPROVED" ? "Your request was approved successfully." : status === "REJECTED" ? "Your request was rejected." : status === "PENDING" ? "Your request is pending review." : "Your request status has been updated.";
  return sendEmail({
    to: recipients,
    subject: `Material request ${status.toLowerCase()}`,
    html: `<div style="font-family: Arial, sans-serif; padding: 20px; color: #333;"><h2 style="color: #db2777;">Request Update</h2><p>Hello ${studentName || "Student"},</p><p>${actionText}</p><div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;"><p style="margin: 5px 0;"><strong>Item:</strong> ${itemName}</p><p style="margin: 5px 0;"><strong>Status:</strong> ${status}</p>${details ? `<p style="margin: 5px 0;"><strong>Details:</strong> ${details}</p>` : ""}</div></div>`,
  });
};

const sendGradeNotification = async ({ recipients, studentName, assignmentTitle, grade, feedback }) => {
  return sendEmail({
    to: recipients,
    subject: `Your grade for ${assignmentTitle}`,
    html: `<div style="font-family: Arial, sans-serif; padding: 20px; color: #333;"><h2 style="color: #db2777;">Grade Available</h2><p>Hello ${studentName || "Student"},</p><p>Your grade for <strong>${assignmentTitle}</strong> has been posted.</p><div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;"><p style="margin: 5px 0;"><strong>Grade:</strong> ${grade}</p><p style="margin: 5px 0;"><strong>Feedback:</strong> ${feedback || "No additional feedback was provided."}</p></div></div>`,
  });
};

// ============================================================================
// SMS LOGIC (PHILSMS)
// ============================================================================

// NEW: Helper function to clean and format PH numbers to 639...
const formatPhPhoneNumber = (number) => {
  if (!number) return null;
  
  // Remove any spaces, dashes, or non-numeric characters
  let cleanNumber = String(number).replace(/\D/g, "");

  // If it's a 10-digit number starting with 9 (e.g., 9123456789), add 63
  if (cleanNumber.length === 10 && cleanNumber.startsWith("9")) {
    return "63" + cleanNumber;
  }
  
  // If it's an 11-digit number starting with 09 (e.g., 09123456789), replace 0 with 63
  if (cleanNumber.length === 11 && cleanNumber.startsWith("09")) {
    return "63" + cleanNumber.substring(1);
  }

  // If it already starts with 639 and is 12 digits, leave it alone
  if (cleanNumber.length === 12 && cleanNumber.startsWith("639")) {
    return cleanNumber;
  }

  // Fallback: return as-is if it doesn't match standard PH formats
  return cleanNumber; 
};

const normalizeSmsRecipients = (recipients) => {
  if (!recipients) return [];

  if (Array.isArray(recipients)) {
    return recipients
      .map((recipient) => {
        if (typeof recipient === "string") return formatPhPhoneNumber(recipient);
        if (recipient && recipient.phoneNumber) return formatPhPhoneNumber(recipient.phoneNumber);
        if (recipient && recipient.phone) return formatPhPhoneNumber(recipient.phone);
        if (recipient && recipient.mobile) return formatPhPhoneNumber(recipient.mobile);
        return null;
      })
      .filter(Boolean);
  }

  if (typeof recipients === "string") return [formatPhPhoneNumber(recipients)];
  if (recipients.phoneNumber) return [formatPhPhoneNumber(recipients.phoneNumber)];
  if (recipients.phone) return [formatPhPhoneNumber(recipients.phone)];
  if (recipients.mobile) return [formatPhPhoneNumber(recipients.mobile)];

  return [];
};

const sendSms = async ({ to, message }) => {
  const numbers = normalizeSmsRecipients(to);

  if (!numbers.length) {
    return { sent: false, skipped: true, provider: "none", count: 0 };
  }

  const apiToken = process.env.PHILSMS_API_TOKEN.trim();
  if (!apiToken) {
    console.warn("SMS skipped: PHILSMS_API_TOKEN is not configured.");
    return { sent: false, skipped: true, provider: "none", count: numbers.length };
  }

  // PhilSMS allows comma-separated numbers for bulk sending
  const recipientString = numbers.join(",");
  const senderId = process.env.PHILSMS_SENDER_ID || "PhilSMS"; 

  try {
    const response = await fetch("https://dashboard.philsms.com/api/v3/sms/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": `Bearer ${apiToken}`,
      },
      body: JSON.stringify({
        recipient: recipientString,
        sender_id: senderId,
        type: "plain",
        message: message,
      }),
    });

    const data = await response.json();

    if (!response.ok || data.status === 'error') {
      throw new Error(data.message || "Failed to send SMS via PhilSMS");
    }

    return { sent: true, provider: "philsms", count: numbers.length, response: data };
  } catch (error) {
    console.error("PhilSMS Error:", error);
    return { sent: false, error: error.message };
  }
};

const sendWelcomeSms = async ({ name, phone, role, password }) => {
  const message = `Welcome to ALAB, ${name}! Role: ${role}. Temp PW: ${password}. Login at: ${getLoginBaseUrl()}/login`;
  return sendSms({ to: phone, message });
};

const sendAssignmentSms = async ({ recipients, title, dueDate, section, facultyName }) => {
  const dueText = dueDate ? ` Due: ${formatDate(dueDate)}.` : "";
  const message = `ALAB: ${facultyName} posted a new activity "${title}" for ${section}.${dueText} Check your dashboard.`;
  return sendSms({ to: recipients, message });
};

const sendSessionSms = async ({ recipients, facultyName, section, reservationDate, startTime, endTime }) => {
  const message = `ALAB: ${facultyName} scheduled a lab session for ${section} on ${formatDate(reservationDate)}, ${startTime}-${endTime}.`;
  return sendSms({ to: recipients, message });
};

const sendMaterialSms = async ({ recipients, title, section, uploadedBy }) => {
  const message = `ALAB: New material "${title}" posted for ${section} by ${uploadedBy}.`;
  return sendSms({ to: recipients, message });
};

const sendRequestStatusSms = async ({ recipients, itemName, status, studentName }) => {
  const message = `ALAB: Hi ${studentName || "Student"}, your material request for "${itemName}" is now ${status}.`;
  return sendSms({ to: recipients, message });
};

const sendGradeSms = async ({ recipients, studentName, assignmentTitle, grade }) => {
  const message = `ALAB: Hi ${studentName || "Student"}, your grade for "${assignmentTitle}" is ${grade}. Check your dashboard.`;
  return sendSms({ to: recipients, message });
};

module.exports = {
  formatDate,
  sendEmail,
  buildWelcomeEmailHtml,
  sendWelcomeEmail,
  sendAssignmentNotification,
  sendSessionNotification,
  sendMaterialNotification,
  sendRequestStatusNotification,
  sendGradeNotification,
  sendSms,
  sendWelcomeSms,
  sendAssignmentSms,
  sendSessionSms,
  sendMaterialSms,
  sendRequestStatusSms,
  sendGradeSms,
};