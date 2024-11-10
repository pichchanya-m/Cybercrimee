# Cybercrime (full-stack)

## Overview
**CyberCrime** is a web application designed to raise awareness and provide information about cybercrime issues. The platform offers various features, including reporting mechanisms, educational resources, statistics, and community support.

## Features
- **User Authentication:** Users can log in via the website using email/password authentication or via Google OAuth 2.0.
- **Report Submission:** Users can submit reports of cybercrimes directly through the website, which will be sent to your email.
- **Statistics and Trends:** Visualizations and data regarding cybercrime incidents.
- **Educational Resources:** Articles and guides on how to prevent cybercrime and stay safe online.

## Technologies Used
- **Frontend:** HTML, CSS, JavaScript, and Bootstrap for responsive design.
- **Backend:** Node.js and Express for server-side logic.
- **Email Service:** Gmail (via Nodemailer) for sending change password.
- **Database:** MySQL.
- **Authentication:** Google OAuth 2.0.

## Google OAuth 2.0 Integration
1. Go to the Google Developer Console
2. Create a new project -> APIs & Services
3. Create OAuth 2.0 Credentials
4. Add the Authorized redirect URI e.g. http://localhost:3500/auth/google/callback
5. Update .env file:
   ```bash 
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   GOOGLE_REDIRECT_URI=http://localhost:3500/auth/google/callback
   
## Installation
To run the project locally, follow these steps:

1. Clone the repository:
   ```bash
   git clone https://github.com/pichchanya-m/cybercrime.git
   cd cybercrime
2. Install dependencies:
    ```bash
    npm install
3. Create a .env file in the root directory and add your environment variables:
   ```bash
   EMAIL_USER=your_email@example.com
   EMAIL_PASS=your_email_password
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   GOOGLE_REDIRECT_URI=http://localhost:3500/auth/google/callback
4. Start the project:
    ```bash
    npm start
5. Open your browser and navigate to http://localhost:3500. 



