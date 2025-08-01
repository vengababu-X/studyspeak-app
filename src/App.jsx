import React, { useState } from 'react';
import { pdfjs } from 'pdfjs-dist';
import 'pdfjs-dist/build/pdf.worker.entry';

const App = () => {
  const [pdfText, setPdfText] = useState('');
  const [question, setQuestion] = useState('');
  const [chat, setChat] = useState([]);
  const [loading, setLoading] = useState(false);

  const extractTextFromPDF = async (file) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const typedarray = new Uint8Array(reader.result);
      const pdf = await pdfjs.getDocument(typedarray).promise;
      let text = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items.map(item => item.str).join(' ');
        text += pageText + '\n';
      }
      setPdfText(text);
      alert('PDF uploaded successfully!');
    };
    reader.readAsArrayBuffer(file);
  };

  const speak = (text, lang = 'en-IN') => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    speechSynthesis.speak(utterance);
  };

  const searchPDF = (q) => {
    const match = pdfText.toLowerCase().includes(q.toLowerCase());
    if (match) {
      const snippet = pdfText
        .split('. ')
        .find(line => line.toLowerCase().includes(q.toLowerCase()));
      return snippet || "Found in PDF but couldn't extract clearly.";
    }
    return null;
  };

  const askQuestion = async () => {
    if (!question.trim()) return;

    setLoading(true);
    const answerFromPDF = searchPDF(question);
    let answer = '';

    if (answerFromPDF) {
      answer = answerFromPDF;
    } else {
      try {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_KEY}`, // Save your API key in `.env`
          },
          body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [
              { role: 'system', content: 'You are a helpful Indian tutor.' },
              { role: 'user', content: question }
            ]
          })
        });
        const data = await res.json();
        answer = data.choices?.[0]?.message?.content || 'No answer from GPT.';
      } catch (e) {
        answer = 'Error fetching from GPT.';
      }
    }

    setChat(prev => [...prev, { question, answer }]);
    speak(answer); // Speak answer in Indian English
    setQuestion('');
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <h1 className="text-xl font-bold text-center mb-4">📚 StudySpeak AI Notebook</h1>

      <div className="mb-4 flex justify-center">
        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => extractTextFromPDF(e.target.files[0])}
          className="border p-2 bg-white rounded"
        />
      </div>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question..."
          className="flex-1 p-2 rounded border"
        />
        <button
          onClick={askQuestion}
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          {loading ? 'Asking...' : 'Ask'}
        </button>
      </div>

      <div className="space-y-4 max-h-[60vh] overflow-y-auto">
        {chat.map((msg, i) => (
          <div key={i} className="p-3 bg-white rounded shadow">
            <p><strong>Q:</strong> {msg.question}</p>
            <p><strong>A:</strong> {msg.answer}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default App;
