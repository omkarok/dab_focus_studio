import { useRef, useState } from "react";

const API_KEY = ((import.meta as any).env?.VITE_OPENAI_API_KEY ?? "") as string;
const WHISPER_URL = "https://api.openai.com/v1/audio/transcriptions";

export function useVoiceRecorder() {
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  // Resolver for an in-flight stop() promise, so cancel() can settle it
  // instead of leaving the awaiting caller hung forever.
  const pendingStopRef = useRef<((text: string) => void) | null>(null);

  const isSupported =
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices &&
    typeof (window as any).MediaRecorder !== "undefined";

  const start = async () => {
    setError(null);
    if (!isSupported) {
      setError("Microphone not supported in this environment.");
      return;
    }
    if (!API_KEY) {
      setError("Set VITE_OPENAI_API_KEY to enable voice transcription.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecording(true);
    } catch (err: any) {
      setError(err?.message || "Microphone permission denied.");
    }
  };

  const stop = (): Promise<string> =>
    new Promise((resolve) => {
      const mr = mediaRecorderRef.current;
      if (!mr) return resolve("");
      const settle = (text: string) => {
        pendingStopRef.current = null;
        resolve(text);
      };
      pendingStopRef.current = settle;
      mr.onstop = async () => {
        mr.stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        if (blob.size === 0) return settle("");
        setTranscribing(true);
        try {
          const form = new FormData();
          form.append("file", blob, "audio.webm");
          form.append("model", "whisper-1");
          const res = await fetch(WHISPER_URL, {
            method: "POST",
            headers: { Authorization: `Bearer ${API_KEY}` },
            body: form,
          });
          if (!res.ok) throw new Error(`Transcription failed (${res.status})`);
          const data = await res.json();
          settle((data.text || "").trim());
        } catch (err: any) {
          setError(err?.message || "Transcription failed.");
          settle("");
        } finally {
          setTranscribing(false);
        }
      };
      mr.stop();
    });

  const cancel = () => {
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== "inactive") {
      mr.onstop = null as any;
      mr.stop();
      mr.stream.getTracks().forEach((t) => t.stop());
    }
    // Settle any stop() promise that was awaiting onstop — otherwise its caller
    // hangs forever, since we just cleared the onstop handler that would resolve it.
    pendingStopRef.current?.("");
    setRecording(false);
    setTranscribing(false);
    chunksRef.current = [];
  };

  return { start, stop, cancel, recording, transcribing, error, isSupported };
}
