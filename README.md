# ALAB:  Adaptive Laboratory Assessment and Bayesian-Knowledge Management Overview

## Google Sign-In

Create a Google OAuth 2.0 Web client in Google Cloud Console and add your app origins to its authorized JavaScript origins, such as `http://localhost:5173`.

Set these environment variables:

```env
GOOGLE_CLIENT_ID=your-google-web-client-id
VITE_GOOGLE_CLIENT_ID=your-google-web-client-id
```

`GOOGLE_CLIENT_ID` belongs in the server environment and `VITE_GOOGLE_CLIENT_ID` belongs in `client/.env`. Google sign-in is available only for existing ALAB accounts whose email matches their Google account.
ALAB is a comprehensive web-based platform designed to optimize laboratory operations. It automates equipment booking, manages administrative workflows, and ensures rigorous safety compliance through an integrated "safety gate" module. This system enforces pre-lab conceptual mastery, ensuring that only students who have met safety standards gain access to high-value laboratory equipment. Developed using React.js, Express.js PostgreSQL, this project emphasizes scalable architecture and student-centered safety design.
## Tech Stack
Core: React, Express.js
## Demo Access
| Role | email | password |
| -------- | -------- |-------- |
| Admin  | admin@email.com  | admin  |
| Faculty  | faculty@email.com  | faculty  |
| Student  | student@email.com  | student  |
