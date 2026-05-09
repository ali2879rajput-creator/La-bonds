import { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { floatTo16BitPCM, arrayBufferToBase64, base64ToArrayBuffer } from '../lib/audio-utils';

export interface UseLiveAPIOptions {
  systemInstruction?: string;
  voiceName?: string;
  onAppointmentBooked?: (data: any) => void;
}

export function useLiveAPI({ systemInstruction, voiceName = "Zephyr", onAppointmentBooked }: UseLiveAPIOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  
  const aiRef = useRef<GoogleGenAI | null>(null);
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const audioQueueRef = useRef<Int16Array[]>([]);
  const isPlayingRef = useRef(false);

  useEffect(() => {
    aiRef.current = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  }, []);

  const stop = () => {
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setIsConnected(false);
    setIsRecording(false);
    audioQueueRef.current = [];
    isPlayingRef.current = false;
  };

  const playNextChunk = async () => {
    if (audioQueueRef.current.length === 0 || isPlayingRef.current) return;
    if (!audioContextRef.current) return;

    isPlayingRef.current = true;
    const pcmData = audioQueueRef.current.shift()!;
    
    // Convert Int16 PCM to Float32 for Web Audio API
    const float32Data = new Float32Array(pcmData.length);
    for (let i = 0; i < pcmData.length; i++) {
        float32Data[i] = pcmData[i] / 32768.0;
    }

    const buffer = audioContextRef.current.createBuffer(1, float32Data.length, 24000); // Gemini 3.1 Live uses 24kHz output
    buffer.getChannelData(0).set(float32Data);

    const source = audioContextRef.current.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContextRef.current.destination);
    
    source.onended = () => {
      isPlayingRef.current = false;
      playNextChunk();
    };
    
    source.start();
  };

  const start = async () => {
    try {
      stop();
      setError(null);
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioContext = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (!sessionRef.current) return;
        const inputData = e.inputBuffer.getChannelData(0);
        const pcmBuffer = floatTo16BitPCM(inputData);
        const base64Data = arrayBufferToBase64(pcmBuffer);
        
        sessionRef.current.sendRealtimeInput({
          audio: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
        });
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      const session = await aiRef.current!.live.connect({
        model: "gemini-3.1-flash-live-preview",
        callbacks: {
          onopen: () => {
            setIsConnected(true);
            setIsRecording(true);
            console.log("Live session connected");
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle audio output
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
              const arrayBuffer = base64ToArrayBuffer(base64Audio);
              const int16Array = new Int16Array(arrayBuffer);
              audioQueueRef.current.push(int16Array);
              playNextChunk();
            }

            // Handle transcription
            if (message.serverContent?.modelTurn?.parts?.[0]?.text) {
                setTranscript(prev => prev + " " + message.serverContent?.modelTurn?.parts![0].text);
            }

            // Handle interruption
            if (message.serverContent?.interrupted) {
              audioQueueRef.current = [];
              isPlayingRef.current = false;
            }

            // Handle Tool Calls
            const toolCall = message.toolCall;
            if (toolCall) {
              for (const call of toolCall.functionCalls) {
                if (call.name === "bookAppointment") {
                  console.log("Appointment Booking Details:", call.args);
                  onAppointmentBooked?.(call.args);
                  session.sendToolResponse({
                    functionResponses: [{
                      id: call.id,
                      response: { output: { success: true, message: "Appointment request received successfully." } }
                    }]
                  });
                }
              }
            }
          },
          onclose: () => {
            console.log("Session closed");
            stop();
          },
          onerror: (err) => {
            console.error("Live session error:", err);
            setError("Connection failed. Please check your API key and microphone.");
            stop();
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName } },
          },
          systemInstruction,
          tools: [{
            functionDeclarations: [{
              name: "bookAppointment",
              description: "Book an appointment for a bail bond. Parameters: clientName, defendantName, jailLocation, time.",
              parameters: {
                type: "OBJECT",
                properties: {
                  clientName: { type: "STRING", description: "Name of the person calling" },
                  defendantName: { type: "STRING", description: "Name of the person in custody" },
                  jailLocation: { type: "STRING", description: "Name/Location of the jail (LA area)" },
                  appointmentTime: { type: "STRING", description: "Requested time for the meeting" }
                },
                required: ["clientName", "defendantName", "jailLocation", "appointmentTime"]
              }
            }]
          }]
        },
      });

      sessionRef.current = session;
    } catch (err) {
      console.error("Failed to start session:", err);
      setError("Could not access microphone or connect to AI. Ensure microphone permissions are granted.");
      stop();
    }
  };

  return { start, stop, isConnected, isRecording, transcript, error };
}
