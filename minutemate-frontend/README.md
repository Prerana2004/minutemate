# 🎙️ MinuteMate – AI-Powered Meeting Summarizer

MinuteMate is a modern web app that records or uploads meeting audio, transcribes it using Whisper (via Hugging Face), and automatically generates clean summaries, decisions, and action items.

---

## ✨ Features

- 🎤 **Record or Upload Audio** – Capture meetings live or upload `.webm` / `.mp3` files.
- 🧠 **AI-Powered Transcription** – Uses **Hugging Face Whisper API** for accurate speech-to-text.
- 📝 **Automatic Summarization** – Extracts **key points**, **decisions**, and **action items** from the transcript.
- 📄 **Download Options** – Save the summary as `.txt`, `.pdf`, or export directly to **Google Docs**.
- ⚡ **Modern UI** – Built with **React** and styled using **Tailwind CSS**.

---

## 🛠 Tech Stack

| Layer        | Tech                               |
|--------------|------------------------------------|
| Frontend     | React, Tailwind CSS, jsPDF         |
| Backend      | Node.js, Express, Multer, FFmpeg   |
| Transcription| Hugging Face Whisper API           |
| Export       | Google Docs API (Optional)         |

---

## 🚀 Deployment Links

- 🔗 **Frontend** (Vercel): [https://minutemate-lyart.vercel.app](https://minutemate-lyart.vercel.app)
- 🔗 **Backend** (Render): [https://minutemate.onrender.com](https://minutemate.onrender.com)

---

## 📁 Folder Structure

```
minutemate/
├── minutemate-frontend/     # React + Tailwind frontend
└── minutemate-backend/      # Node.js + Express backend with Whisper API
```

---

## 🧩 Backend Setup (`minutemate-backend`)

1. **Navigate to backend folder**:
   ```bash
   cd minutemate-backend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Create `.env` file** with your Hugging Face token:
   ```env
   HF_TOKEN=your_huggingface_token_here
   ```

4. **Run the server locally** (for testing):
   ```bash
   node index.js
   ```

5. **Deploy on Render** (Connect GitHub repo, set environment variable `HF_TOKEN`, and deploy).

---

## 💻 Frontend Setup (`minutemate-frontend`)

1. **Navigate to frontend folder**:
   ```bash
   cd minutemate-frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start development server**:
   ```bash
   npm start
   ```

4. **Update backend URL in code** (if not already):
   ```js
   // in your fetch request
   const response = await fetch("https://minutemate.onrender.com/transcribe-clean", { ... });
   ```

5. **Deploy to Vercel**: Connect your GitHub repo and deploy with default settings.

---

## 🧪 Example Use Case

1. Click “Start Recording” or upload an audio file.
2. Wait for automatic transcription and summarization.
3. View:
   - Full meeting transcript
   - Key points
   - Action items with responsible persons
4. Download summary as `.txt`, `.pdf`, or export to Google Docs.

---

## 📄 Sample Output

```
Meeting Summary
Title: Monthly Planning Meeting
Date: 25 July 2025
Participants: Prerna

Key Points:
• We have completed over 70% of our project.
• The #deadline for submitting the prototype is Friday.
• We have decided to launch the project by Sunday.
• It's really #urgent and we need to finish it #asap.
• Raj will take #action on the feedback.

Decisions:
• We have decided to launch the project by Sunday.

Action Items:
• It's really #urgent and we need to finish it #asap — Responsible: Someone
• Raj will take #action on the feedback — Responsible: Raj
```

---

## 🤝 Contributions

Feel free to fork and raise PRs if you'd like to enhance MinuteMate!  
Created by **Prerana**.