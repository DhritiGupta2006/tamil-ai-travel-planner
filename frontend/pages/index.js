import { useState, useEffect } from 'react';
import Head from 'next/head';
import VoiceRecorder from '../components/VoiceRecorder';
import ItineraryDisplay from '../components/ItineraryDisplay';
import { sendQuery, sendVoice, fetchRecent } from '../services/api';

export default function Home() {
  const [text, setText] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [recent, setRecent] = useState([]);
  const [showRecent, setShowRecent] = useState(false);

  // Load recent queries on mount
  useEffect(() => {
    fetchRecent()
      .then(data => setRecent(data))
      .catch(() => {});
  }, []);

  async function handleTextSubmit(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setLoading(true);
    setError('');
    try {
      const data = await sendQuery(text.trim());
      setResult(data);
      setRecent(prev => [data, ...prev].slice(0, 10));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleVoiceRecorded(blob) {
    setLoading(true);
    setError('');
    try {
      const data = await sendVoice(blob);
      setResult(data);
      if (data.transcript) setText(data.transcript);
      setRecent(prev => [data, ...prev].slice(0, 10));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Head>
        <title>Tamil AI Travel Planner</title>
        <meta name="description" content="AI-powered Tamil travel planner" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div style={containerStyle}>
        {/* Header */}
        <header style={headerStyle}>
          <h1 style={{ margin: 0, fontSize: 28 }}>✈️ தமிழ் AI பயண திட்டமிடுபவர்</h1>
          <p style={{ margin: '6px 0 0', fontSize: 14, opacity: 0.85 }}>
            Tamil AI Travel Planner — Voice & Text Powered
          </p>
        </header>

        <main style={mainStyle}>
          {/* Input Section */}
          <section style={sectionStyle}>
            <h2 style={sectionTitleStyle}>🗣️ உங்கள் பயணத்தை திட்டமிடுங்கள்</h2>

            {/* Text input */}
            <form onSubmit={handleTextSubmit} style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  value={text}
                  onChange={e => setText(e.target.value)}
                  placeholder="எ.கா: Chennai இருந்து Madurai பயண திட்டம் தேவை"
                  style={inputStyle}
                  disabled={loading}
                />
                <button
                  type="submit"
                  style={primaryBtnStyle(loading)}
                  disabled={loading || !text.trim()}
                >
                  {loading ? 'செயலாக்கம்…' : '🔍 தேடு'}
                </button>
              </div>
            </form>

            {/* Divider */}
            <div style={{ textAlign: 'center', margin: '12px 0', color: '#999', fontSize: 13 }}>
              — அல்லது குரல் மூலம் —
            </div>

            {/* Voice recorder */}
            <VoiceRecorder onRecorded={handleVoiceRecorded} disabled={loading} />

            {/* Error */}
            {error && (
              <div style={errorStyle}>
                ⚠️ {error}
              </div>
            )}
          </section>

          {/* Result */}
          {loading && (
            <div style={{ textAlign: 'center', padding: 32, color: '#666' }}>
              ⏳ திட்டம் தயாராகிறது…
            </div>
          )}
          {!loading && result && <ItineraryDisplay result={result} />}

          {/* Recent queries */}
          {recent.length > 0 && (
            <section style={{ ...sectionStyle, marginTop: 24 }}>
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                onClick={() => setShowRecent(v => !v)}
              >
                <h2 style={{ ...sectionTitleStyle, margin: 0 }}>🕒 சமீபத்திய தேடல்கள்</h2>
                <span style={{ fontSize: 14, color: '#3498db' }}>{showRecent ? '▲ மறை' : '▼ காட்டு'}</span>
              </div>
              {showRecent && (
                <ul style={{ listStyle: 'none', padding: 0, marginTop: 12 }}>
                  {recent.map((item, i) => (
                    <li
                      key={item.queryId || i}
                      style={recentItemStyle}
                      onClick={() => setResult(item)}
                    >
                      <span style={{ fontWeight: 600, fontSize: 14 }}>
                        {item.entities?.source && item.entities?.destination
                          ? `${item.entities.source} → ${item.entities.destination}`
                          : item.transcript}
                      </span>
                      <span style={{ fontSize: 12, color: '#777', marginLeft: 8 }}>
                        [{item.intent}]
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </main>
      </div>
    </>
  );
}

// Styles
const containerStyle = {
  minHeight: '100vh',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  fontFamily: "'Segoe UI', 'Noto Sans Tamil', Arial, sans-serif",
};
const headerStyle = {
  background: 'rgba(0,0,0,0.25)',
  color: '#fff',
  textAlign: 'center',
  padding: '28px 20px 20px',
};
const mainStyle = {
  maxWidth: 720,
  margin: '0 auto',
  padding: '24px 16px 40px',
};
const sectionStyle = {
  background: '#fff',
  borderRadius: 12,
  boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
  padding: 24,
};
const sectionTitleStyle = {
  fontSize: 17,
  color: '#2c3e50',
  marginBottom: 16,
  marginTop: 0,
};
const inputStyle = {
  flex: 1,
  padding: '12px 14px',
  borderRadius: 8,
  border: '1px solid #ddd',
  fontSize: 15,
  outline: 'none',
  fontFamily: 'inherit',
};
function primaryBtnStyle(disabled) {
  return {
    background: disabled ? '#aaa' : '#3498db',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '12px 20px',
    fontSize: 15,
    cursor: disabled ? 'not-allowed' : 'pointer',
    whiteSpace: 'nowrap',
    fontFamily: 'inherit',
  };
}
const errorStyle = {
  marginTop: 12,
  padding: '10px 14px',
  background: '#fde8e8',
  border: '1px solid #f5c6c6',
  borderRadius: 8,
  color: '#c0392b',
  fontSize: 14,
};
const recentItemStyle = {
  padding: '10px 14px',
  borderRadius: 8,
  cursor: 'pointer',
  marginBottom: 6,
  background: '#f8f9fa',
  border: '1px solid #eee',
  transition: 'background 0.2s',
};
