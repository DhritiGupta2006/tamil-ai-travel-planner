import { useCallback } from 'react';

/**
 * ItineraryDisplay component.
 * Shows the generated itinerary text and a "Read aloud" (TTS) button.
 *
 * Props:
 *   result: object — the response from the backend
 */
export default function ItineraryDisplay({ result }) {
  const speak = useCallback(() => {
    if (!result?.itinerary) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(result.itinerary);
    // Prefer Tamil voice if available
    const voices = window.speechSynthesis.getVoices();
    const tamilVoice = voices.find(v => v.lang.startsWith('ta'));
    if (tamilVoice) utterance.voice = tamilVoice;
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  }, [result]);

  if (!result) return null;

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: 18, color: '#2c3e50' }}>📋 பயண திட்டம்</h2>
        <button onClick={speak} style={speakBtnStyle} title="Read itinerary aloud">
          🔊 கேளுங்கள்
        </button>
      </div>

      {/* Meta info */}
      <div style={{ marginBottom: 10, fontSize: 13, color: '#555' }}>
        <span style={badgeStyle('#3498db')}>{result.intent || 'plan_trip'}</span>
        {result.entities?.source && (
          <span style={badgeStyle('#27ae60')}>📍 {result.entities.source}</span>
        )}
        {result.entities?.destination && (
          <span style={badgeStyle('#e67e22')}>🏁 {result.entities.destination}</span>
        )}
        {result.entities?.date && (
          <span style={badgeStyle('#9b59b6')}>📅 {result.entities.date}</span>
        )}
      </div>

      {/* Transcript */}
      {result.transcript && (
        <div style={{ marginBottom: 10, fontSize: 13, color: '#666', fontStyle: 'italic' }}>
          💬 &quot;{result.transcript}&quot;
        </div>
      )}

      {/* Itinerary text */}
      <pre style={itineraryStyle}>{result.itinerary}</pre>

      {/* Travel options table */}
      {result.travelOptions?.options && (
        <TravelOptionsTable options={result.travelOptions.options} />
      )}
    </div>
  );
}

function TravelOptionsTable({ options }) {
  const allOptions = [
    ...(options.train || []).map(t => ({ type: 'Train 🚂', ...t })),
    ...(options.bus || []).map(b => ({ type: 'Bus 🚌', ...b })),
    ...(options.flight || []).map(f => ({ type: 'Flight ✈️', ...f })),
  ];

  if (allOptions.length === 0) return null;

  return (
    <div style={{ marginTop: 16 }}>
      <h3 style={{ fontSize: 15, marginBottom: 8, color: '#2c3e50' }}>🎫 பயண விருப்பங்கள்</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: '#f0f0f0' }}>
            <th style={thStyle}>வகை</th>
            <th style={thStyle}>பெயர்</th>
            <th style={thStyle}>கட்டணம்</th>
            <th style={thStyle}>நேரம்</th>
          </tr>
        </thead>
        <tbody>
          {allOptions.map((opt, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? '#fafafa' : '#fff' }}>
              <td style={tdStyle}>{opt.type}</td>
              <td style={tdStyle}>{opt.name}</td>
              <td style={tdStyle}>₹{opt.price}</td>
              <td style={tdStyle}>{opt.duration}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Styles
const cardStyle = {
  background: '#fff',
  borderRadius: 12,
  boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
  padding: 24,
  marginTop: 24,
};
const speakBtnStyle = {
  background: '#27ae60',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  padding: '6px 14px',
  cursor: 'pointer',
  fontSize: 14,
};
const itineraryStyle = {
  background: '#f8f9fa',
  borderRadius: 8,
  padding: 16,
  whiteSpace: 'pre-wrap',
  fontFamily: 'inherit',
  fontSize: 14,
  lineHeight: 1.7,
  color: '#333',
};
const thStyle = { padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid #ddd' };
const tdStyle = { padding: '7px 10px', borderBottom: '1px solid #eee' };
function badgeStyle(color) {
  return {
    display: 'inline-block',
    background: color,
    color: '#fff',
    borderRadius: 12,
    padding: '2px 10px',
    marginRight: 6,
    fontSize: 12,
  };
}
