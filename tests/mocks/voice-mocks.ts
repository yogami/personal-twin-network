
/**
 * Voice API Mocks
 * Injects a fake SpeechRecognition implementation into the page
 * allowing us to simulate specific user voice inputs.
 */

export const mockSpeechRecognition = `
window.SpeechRecognition = class MockSpeechRecognition {
    constructor() {
        this.continuous = false;
        this.interimResults = false;
        this.lang = 'en-US';
        this.onresult = null;
        this.onend = null;
        this.onstart = null;
        
        // Listen for test automation triggers
        window.addEventListener('TRIGGER_SPEECH', (e) => {
            if (this.onstart) this.onstart();
            
            const transcript = e.detail;
            const event = {
                resultIndex: 0,
                results: {
                    0: {
                        0: { transcript: transcript, confidence: 1 },
                        isFinal: true
                    },
                    length: 1
                }
            };
            
            if (this.onresult) this.onresult(event);
            if (this.onend) this.onend();
        });
    }

    start() {
        console.log('[MockSpeech] Started listening');
        if (this.onstart) this.onstart();
    }

    stop() {
        console.log('[MockSpeech] Stopped listening');
        if (this.onend) this.onend();
    }
    
    abort() { this.stop(); }
};

window.webkitSpeechRecognition = window.SpeechRecognition;

// Mock Synthesis (TTS)
const mockSynthesis = {
    speak: (utterance) => {
        console.log('[MockTTS] Speaking:', utterance.text);
        window.dispatchEvent(new CustomEvent('TWIN_SPOKE', { detail: utterance.text }));
        
        // Trigger events
        if (utterance.onstart) utterance.onstart();
        setTimeout(() => {
            if (utterance.onend) utterance.onend();
        }, 50); // Fast forward
    },
    cancel: () => {},
    getVoices: () => [{ name: 'Google US English', lang: 'en-US' }],
    pause: () => {},
    resume: () => {},
    onvoiceschanged: null,
    pending: false,
    speaking: false,
    paused: false
};

// Use defineProperty because allowed in some browsers to just assign, but safer here
Object.defineProperty(window, 'speechSynthesis', {
    value: mockSynthesis,
    writable: true
});

window.SpeechSynthesisUtterance = class MockUtterance {
    constructor(text) { 
        this.text = text; 
        this.lang = 'en-US';
        this.pitch = 1;
        this.rate = 1;
        this.volume = 1;
        this.voice = null;
        this.onstart = null;
        this.onend = null;
        this.onerror = null;
        this.onpause = null;
        this.onresume = null;
        this.onmark = null;
        this.onboundary = null;
    }
};
`;
