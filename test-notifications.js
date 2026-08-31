require("dotenv").config();
console.log("My PhilSMS Token is:", process.env.PHILSMS_API_TOKEN);
const { 
  sendAssignmentNotification, 
  sendAssignmentSms 
} = require("./utils/emailService"); 

async function runTest() {
  console.log("🚀 Starting Notification Test...");

  const testStudent = {
    name: "Test Student",
    email: "dwightjimenez00@gmail.com", // <-- Put your email here
    phone: "639761694066",               // <-- Put your PhilSMS formatted number here
  };

  const notificationData = {
    recipients: [testStudent], 
    title: "Testing PhilSMS & Brevo Integration",
    dueDate: new Date(),
    section: "Test Section A",
    facultyName: "System Admin",
  };

  try {
    console.log("📧 Attempting to send Email...");
    const emailResult = await sendAssignmentNotification(notificationData);
    console.log("Email Status:", emailResult);

    console.log("📱 Attempting to send SMS...");
    const smsResult = await sendAssignmentSms(notificationData);
    console.log("SMS Status:", smsResult);

    console.log("✅ Test script finished!");
  } catch (error) {
    console.error("❌ Test failed with error:", error);
  }
}

runTest();