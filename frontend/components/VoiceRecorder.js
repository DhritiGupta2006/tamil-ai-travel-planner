import { useState, useRef, useCallback } from 'react';

/**
 * VoiceRecorder component.
 * Uses the browser MediaRecorder API to capture audio and returns the recorded Blob.
 *
 * Props:
 *   onRecorded(blob: Blob) — called when recording stops with the audio blob
 *   disabled?: boolean
 */
export default function VoiceRecorder({ onRecorded, disabled = false }) {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState('');
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const startRecording = useCallback(async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = e => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        onRecorded(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      setError('Microphone access denied or not available.');
    }
  }, [onRecorded]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      {!isRecording ? (
        <button
          onClick={startRecording}
          disabled={disabled}
          style={btnStyle('#e74c3c', disabled)}
          title="Start voice recording"
        >
          🎙️ பேசுங்கள் (Record)
        </button>
      ) : (
        <button
          onClick={stopRecording}
          style={btnStyle('#c0392b')}
          title="Stop recording"
        >
          ⏹ நிறுத்து (Stop)
        </button>
      )}
      {isRecording && (
        <span style={{ color: '#e74c3c', fontSize: 13, animation: 'pulse 1s infinite' }}>
          🔴 பதிவு நடக்கிறது…
        </span>
      )}
      {error && <span style={{ color: '#c0392b', fontSize: 13 }}>{error}</span>}
    </div>
  );
}

function btnStyle(bg, disabled = false) {
  return {
    background: disabled ? '#ccc' : bg,
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '10px 24px',
    fontSize: 16,
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: 'inherit',
  };
}
