const features = [
  {
    icon: "🎙️",
    title: "Real-time Voice Recording",
    description: "Capture spoken content instantly using your microphone, perfect for meetings and interviews.",
  },
  {
    icon: "📁",
    title: "Upload MP3/WebM Files",
    description: "Upload existing audio files and automatically convert them into text in seconds.",
  },
  {
    icon: "📄",
    title: "Clean Transcripts",
    description: "Get readable, well-formatted transcripts without background noise or filler words.",
  },
  {
    icon: "📤",
    title: "Export to Google Docs",
    description: "Quickly send your transcript to Google Docs for sharing, editing, or collaboration.",
  },
  {
    icon: "🧠",
    title: "AI-Powered Summaries",
    description: "Use Local Whisper to generate concise meeting summaries using advanced AI models.",
  },
  {
    icon: "✅",
    title: "Action Item Extraction",
    description: "Automatically identify and extract key action items from your conversations.",
  },
];

export default function Features() {
  return (
    <section className="py-12 bg-white" id="features">
      <div className="max-w-6xl mx-auto px-6">
        <h2 className="text-3xl font-extrabold text-gray-900 mb-10 text-center">App Features</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, idx) => (
            <div
              key={idx}
              className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-2xl shadow p-6 hover:shadow-md transition-all"
            >
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">{feature.title}</h3>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
