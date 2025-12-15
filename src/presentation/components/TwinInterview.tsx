'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

// ============================================================================
// Web Speech API Types
// ============================================================================
interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList;
    resultIndex: number;
}

interface SpeechRecognitionResultList {
    length: number;
    item(index: number): SpeechRecognitionResult;
    [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
    isFinal: boolean;
    length: number;
    item(index: number): SpeechRecognitionAlternative;
    [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
    transcript: string;
    confidence: number;
}

interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    start(): void;
    stop(): void;
    abort(): void;
    onresult: (event: SpeechRecognitionEvent) => void;
    onerror: (event: Event) => void;
    onend: () => void;
}

declare global {
    interface Window {
        SpeechRecognition: new () => SpeechRecognition;
        webkitSpeechRecognition: new () => SpeechRecognition;
    }
}

// ============================================================================
// Props
// ============================================================================
interface TwinInterviewProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onInterviewComplete: (extractedData: any) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    currentProfile?: any;
}

/**
 * TwinInterview - Interactive Voice Training
 * Uses Web Speech API for STT and TTS
 */
export function TwinInterview({ onInterviewComplete, currentProfile }: TwinInterviewProps) {
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [twinMessage, setTwinMessage] = useState("Hi! I'm your digital twin. I'd love to get to know you. What's your name and what do you do?");

    // Conversation history to track context
    const [history, setHistory] = useState<{ role: 'twin' | 'user', text: string }[]>([]);

    const recognitionRef = useRef<SpeechRecognition | null>(null);
    const synthesisRef = useRef<SpeechSynthesis | null>(null);
    const transcriptRef = useRef('');

    // Keep transcript ref in sync
    useEffect(() => { transcriptRef.current = transcript; }, [transcript]);

    // 1. Define Listening Controls (Hoist above speak)
    const startListening = useCallback(() => {
        if (recognitionRef.current && !isListening) {
            setTranscript('');
            transcriptRef.current = '';
            try {
                recognitionRef.current.start();
                setIsListening(true);
            } catch (e) {
                console.error("Speech recognition start failed", e);
            }
        }
    }, [isListening]);

    const stopListening = useCallback(() => {
        if (recognitionRef.current && isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
        }
    }, [isListening]);

    // 2. Define Speak (depends on startListening)
    const speak = useCallback((text: string) => {
        if (!synthesisRef.current) return;

        // Cancel any ongoing speech
        synthesisRef.current.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        // Try to find a nice voice
        const voices = synthesisRef.current.getVoices();
        const preferredVoice = voices.find(v => v.name.includes('Google') || v.name.includes('Samantha'));
        if (preferredVoice) utterance.voice = preferredVoice;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => {
            setIsSpeaking(false);
            // Auto-start listening after speaking finishes
            setTimeout(() => startListening(), 500);
        };

        setTwinMessage(text);
        synthesisRef.current.speak(utterance);
    }, [startListening]);

    // 3. Define Answer Handler (depends on speak)
    const handleUserAnswer = useCallback(async (answer: string) => {
        // Add to history
        const newHistory = [...history, { role: 'twin' as const, text: twinMessage }, { role: 'user' as const, text: answer }];
        setHistory(newHistory);

        // Call Twin Brain (LLM) to process answer & get next question
        try {
            const response = await fetch('/api/twin/interview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    history: newHistory,
                    currentProfile: currentProfile
                })
            });

            const data = await response.json();

            if (data.isComplete) {
                speak("Thanks! I think I have enough to build your twin now.");
                onInterviewComplete(data.extractedProfile);
            } else {
                speak(data.nextQuestion);
            }

        } catch (error) {
            console.error("Interview error", error);
            speak("I'm having trouble processing that. Could you say it again?");
        }
    }, [history, twinMessage, currentProfile, onInterviewComplete, speak]);

    // 4. Initialize Speech APIs (depends on handleUserAnswer)
    useEffect(() => {
        if (typeof window !== 'undefined') {
            // TTS
            if ('speechSynthesis' in window) {
                synthesisRef.current = window.speechSynthesis;
            }

            // STT
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (SpeechRecognition) {
                const recognition = new SpeechRecognition();
                recognition.continuous = false; // We want turn-based
                recognition.interimResults = true;
                recognition.lang = 'en-US';

                recognition.onresult = (event: SpeechRecognitionEvent) => {
                    const current = event.resultIndex;
                    const result = event.results[current];
                    const transcriptText = result[0].transcript;
                    setTranscript(transcriptText);
                };

                recognition.onend = () => {
                    setIsListening(false);
                    // If we have a finalized transcript, process it
                    const finalTranscript = transcriptRef.current;
                    if (finalTranscript.trim().length > 2) { // Minimal length check
                        handleUserAnswer(finalTranscript);
                    }
                };

                recognitionRef.current = recognition;
            }
        }
    }, [handleUserAnswer]);

    // Initial greeting
    useEffect(() => {
        const timer = setTimeout(() => {
            speak(twinMessage);
        }, 1000);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Run once on mount

    return (
        <div className="twin-interview">
            <div className="avatar-container">
                <div className={`avatar-circle ${isSpeaking ? 'speaking' : ''} ${isListening ? 'listening' : ''}`}>
                    <span className="avatar-initial">T</span>
                    {isSpeaking && <div className="ripple-ring" />}
                </div>
            </div>

            <div className="conversation-area">
                <div className="twin-message">
                    <p>{twinMessage}</p>
                </div>

                {transcript && (
                    <div className="user-transcript">
                        <p>You: {transcript}</p>
                    </div>
                )}
            </div>

            <div className="controls">
                <button
                    className={`mic-btn ${isListening ? 'active' : ''}`}
                    onClick={isListening ? stopListening : startListening}
                >
                    {isListening ? '🛑 Stop' : '🎤 Tap to Speak'}
                </button>
            </div>

            <style jsx>{`
                .twin-interview {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    padding: 2rem;
                    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                    border-radius: 24px;
                    min-height: 400px;
                    color: white;
                }

                .avatar-container {
                    margin-bottom: 2rem;
                    position: relative;
                }

                .avatar-circle {
                    width: 100px;
                    height: 100px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 2.5rem;
                    font-weight: 700;
                    position: relative;
                    z-index: 2;
                    transition: all 0.3s ease;
                }
                
                .avatar-circle.listening {
                    box-shadow: 0 0 0 4px rgba(74, 222, 128, 0.5);
                    transform: scale(1.05);
                }

                .ripple-ring {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    border-radius: 50%;
                    border: 2px solid rgba(102, 126, 234, 0.8);
                    animation: ripple 1.5s infinite linear;
                    z-index: 1;
                }

                @keyframes ripple {
                    0% { transform: scale(1); opacity: 0.8; }
                    100% { transform: scale(1.5); opacity: 0; }
                }

                .conversation-area {
                    flex: 1;
                    width: 100%;
                    max-width: 400px;
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                    margin-bottom: 2rem;
                    overflow-y: auto;
                }

                .twin-message {
                    background: rgba(255, 255, 255, 0.1);
                    padding: 1rem;
                    border-radius: 12px 12px 12px 0;
                    align-self: flex-start;
                }

                .user-transcript {
                    background: rgba(102, 126, 234, 0.2);
                    padding: 1rem;
                    border-radius: 12px 12px 0 12px;
                    align-self: flex-end;
                    text-align: right;
                }

                .mic-btn {
                    padding: 1rem 2rem;
                    border-radius: 50px;
                    border: none;
                    background: #667eea;
                    color: white;
                    font-size: 1.1rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.3);
                }

                .mic-btn:hover {
                    transform: translateY(-2px);
                    background: #5a6fd6;
                }
                
                .mic-btn.active {
                    background: #ef4444;
                    animation: pulse 2s infinite;
                }

                @keyframes pulse {
                    0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
                    70% { box-shadow: 0 0 0 15px rgba(239, 68, 68, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
                }
            `}</style>
        </div>
    );
}
