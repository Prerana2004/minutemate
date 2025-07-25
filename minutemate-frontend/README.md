# MinuteMate (React + Tailwind Starter)

🎙 MinuteMate – AI Meeting Summarizer

A React + Node.js application that records or uploads meeting audio, transcribes it using Whisper, and generates concise meeting summaries.

✨ Features
🎤 Record or Upload Audio – Capture meetings live or upload .mp3/.webm files.

🧠 AI-Powered Transcription – Uses OpenAI Whisper for accurate speech-to-text.

📝 Automatic Summarization – Extracts key points, decisions, and action items from meetings.

📄 Download Summary as PDF – Get clean, shareable meeting summaries.

⚡ Modern Stack – React + Tailwind CSS frontend, Node.js + Express backend.

🛠 Tech Stack

Frontend: React, Tailwind CSS

Backend: Node.js, Express, Multer

Transcription: FFmpeg + Whisper CLI

File Support: .webm, .mp3

PDF Export: jsPDF

🚀 Getting Started

📦 Backend Setup

Navigate to the minutemate-backend folder:
cd minutemate-backend

Install dependencies:
npm install

Start the server:
node index.js
Server will run at: http://localhost:5000

⚠️ Make sure Whisper CLI and FFmpeg are installed and available in your system path.

💻 Frontend Setup

Navigate to the minutemate-frontend folder:
cd minutemate-frontend

Install dependencies:
npm install

Start the React app:
npm start
Open: http://localhost:3000

📁 Folder Structure

minutemate/
├── minutemate-frontend/      # React + Tailwind frontend
├── minutemate-backend/       # Node.js + Express + Whisper backend

📌 Example Use Case

Record a meeting or upload an existing audio file.

Wait for the transcription and summary.

Review the output.

Download the meeting summary as a .txt, PDF or export to DOCS.

📃 Output Format

📄 Transcription:
Meeting Summary
Title: the monthly planning meeting
Date: 25 July 2025
Participants: Prerna

Key Points:
• So we have completed over 70% of our project.
• The #deadline for submitting the prototype is Friday.
• We have decided to launch the project by Sunday.
• It's really #urgent and we need to finish it #asap.
• Raj will take #action on the feedback.

Decisions:
• We have decided to launch the project by Sunday.

#Action Items:
• It's really #urgent and we need to finish it #asap — Responsible: Someone
• Raj will take #action on the feedback — Responsible: Raj