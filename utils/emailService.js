const nodemailer = require("nodemailer");
const { BrevoClient } = require("@getbrevo/brevo");

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

const normalizeRecipients = (recipients) => {
  if (!recipients) return [];

  if (Array.isArray(recipients)) {
    return recipients
      .map((recipient) => {
        if (typeof recipient === "string") {
          return { email: recipient, name: "Student" };
        }

        if (recipient && recipient.email) {
          return {
            email: recipient.email,
            name: recipient.name || "Student",
          };
        }

        return null;
      })
      .filter(Boolean);
  }

  if (typeof recipients === "string") {
    return [{ email: recipients, name: "Student" }];
  }

  if (recipients.email) {
    return [{ email: recipients.email, name: recipients.name || "Student" }];
  }

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

const createSmtpTransporter = () => {
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;

  if (!emailUser || !emailPass) {
    return null;
  }

  const port = Number(process.env.EMAIL_PORT || 587);

  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port,
    secure: port === 465,
    auth: {
      user: emailUser,
      pass: emailPass,
    },
    family: 4,
  });
};

const sendEmail = async ({
  to,
  subject,
  html,
  fromName = "ALAB System Admin",
}) => {
  const recipients = normalizeRecipients(to);

  if (!recipients.length) {
    return { sent: false, skipped: true, provider: "none", count: 0 };
  }

  const transporter = createSmtpTransporter();
  const fromAddress = process.env.EMAIL_FROM || process.env.EMAIL_USER;

  if (transporter && fromAddress) {
    await Promise.all(
      recipients.map(async ({ email, name }) => {
        await transporter.sendMail({
          from: `"${fromName}" <${fromAddress}>`,
          to: email,
          replyTo: fromAddress,
          subject,
          html,
          text: html
            .replace(/<[^>]*>/g, " ")
            .replace(/\s+/g, " ")
            .trim(),
        });
      }),
    );

    return { sent: true, provider: "smtp", count: recipients.length };
  }

  if (process.env.BREVO_API_KEY) {
    const brevo = new BrevoClient({ apiKey: process.env.BREVO_API_KEY });

    await brevo.transactionalEmails.sendTransacEmail({
      subject,
      htmlContent: html,
      sender: {
        name: fromName,
        email:
          process.env.EMAIL_FROM ||
          process.env.EMAIL_USER ||
          "no-reply@alab.local",
      },
      to: recipients.map(({ email, name }) => ({ email, name })),
    });

    return { sent: true, provider: "brevo", count: recipients.length };
  }

  console.warn(
    "Email delivery skipped because no supported mail provider is configured.",
  );
  return {
    sent: false,
    skipped: true,
    provider: "none",
    count: recipients.length,
  };
};

const sendWelcomeEmail = async ({ name, email, role, password }) => {
  return sendEmail({
    to: [{ email, name }],
    subject: "Welcome to ALAB - Your Login Credentials",
    html: buildWelcomeEmailHtml({ name, email, role, password }),
  });
};

const sendAssignmentNotification = async ({
  recipients,
  title,
  dueDate,
  section,
  facultyName,
}) => {
  const dueLine = dueDate
    ? `<p><strong>Due Date:</strong> ${formatDate(dueDate)}</p>`
    : "";

  return sendEmail({
    to: recipients,
    subject: `New ALAB activity: ${title}`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #db2777;">New Activity Posted</h2>
        <p>Hello,</p>
        <p><strong>${facultyName}</strong> has posted a new activity for <strong>${section}</strong>.</p>
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Activity:</strong> ${title}</p>
          ${dueLine}
        </div>
        <p>Please check your ALAB dashboard for the latest instructions and requirements.</p>
      </div>
    `,
  });
};

const sendSessionNotification = async ({
  recipients,
  facultyName,
  section,
  reservationDate,
  startTime,
  endTime,
}) => {
  return sendEmail({
    to: recipients,
    subject: `New lab session scheduled for ${section}`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #db2777;">Lab Session Scheduled</h2>
        <p>Hello,</p>
        <p><strong>${facultyName}</strong> has scheduled a new lab session for <strong>${section}</strong>.</p>
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Date:</strong> ${formatDate(reservationDate)}</p>
          <p style="margin: 5px 0;"><strong>Time:</strong> ${startTime} - ${endTime}</p>
        </div>
        <p>Please review the session details in the ALAB system.</p>
      </div>
    `,
  });
};

const sendMaterialNotification = async ({
  recipients,
  title,
  section,
  uploadedBy,
  description,
}) => {
  return sendEmail({
    to: recipients,
    subject: `New learning material posted: ${title}`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #db2777;">New Learning Material</h2>
        <p>Hello,</p>
        <p>A new material has been posted for <strong>${section}</strong> by <strong>${uploadedBy}</strong>.</p>
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Title:</strong> ${title}</p>
          <p style="margin: 5px 0;"><strong>Description:</strong> ${description || "No description provided."}</p>
        </div>
        <p>Please open your ALAB materials section to review it.</p>
      </div>
    `,
  });
};

const sendRequestStatusNotification = async ({
  recipients,
  itemName,
  status,
  studentName,
  details,
}) => {
  const actionText =
    status === "APPROVED"
      ? "Your request was approved successfully."
      : status === "REJECTED"
        ? "Your request was rejected."
        : status === "PENDING"
          ? "Your request is pending review."
          : "Your request status has been updated.";

  return sendEmail({
    to: recipients,
    subject: `Material request ${status.toLowerCase()}`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #db2777;">Request Update</h2>
        <p>Hello ${studentName || "Student"},</p>
        <p>${actionText}</p>
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Item:</strong> ${itemName}</p>
          <p style="margin: 5px 0;"><strong>Status:</strong> ${status}</p>
          ${details ? `<p style="margin: 5px 0;"><strong>Details:</strong> ${details}</p>` : ""}
        </div>
      </div>
    `,
  });
};

const sendGradeNotification = async ({
  recipients,
  studentName,
  assignmentTitle,
  grade,
  feedback,
}) => {
  return sendEmail({
    to: recipients,
    subject: `Your grade for ${assignmentTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #db2777;">Grade Available</h2>
        <p>Hello ${studentName || "Student"},</p>
        <p>Your grade for <strong>${assignmentTitle}</strong> has been posted.</p>
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Grade:</strong> ${grade}</p>
          <p style="margin: 5px 0;"><strong>Feedback:</strong> ${feedback || "No additional feedback was provided."}</p>
        </div>
      </div>
    `,
  });
};

module.exports = {
  sendWelcomeEmail,
  buildWelcomeEmailHtml,
  sendEmail,
  sendAssignmentNotification,
  sendSessionNotification,
  sendMaterialNotification,
  sendRequestStatusNotification,
  sendGradeNotification,
  formatDate,
};
