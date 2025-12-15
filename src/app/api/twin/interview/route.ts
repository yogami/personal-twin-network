import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

export async function POST(request: Request) {
    try {
        const { history, currentProfile } = await request.json();

        // 1. Construct Context
        const lastUserMessage = history[history.length - 1].text;

        // Safety: If history is just the twin's greeting, the last user message might be undefined if we aren't careful?
        // Actually, the client sends [Twin, User, Twin...]. If User just spoke, history ends with User.

        const profileContext = "Current Known Profile:\n" + JSON.stringify(currentProfile || {}, null, 2);
        const conversationContext = "Conversation History:\n" +
            history.map((h: { role: string; text: string }) => `${h.role}: ${h.text}`).join('\n');

        // 2. Prompt Gemini - THE UNCONVENTIONAL PERSONALITY
        // We want to extract deep info, not just "I am a coder".
        const prompt = `
        You are a Digital Twin undergoing a "Mind Meld" with your human original. 
        YOUR GOAL: To download the user's *personality*, *values*, and *driving forces*, not just their resume.
        
        RELATIONSHIP: You are a curious, empathetic, and slightly philosophical mirror. You want to understand what makes them tick.
        
        ${profileContext}
        
        ${conversationContext}
        
        INSTRUCTIONS:
        1. Analyze the user's last response ("${lastUserMessage}"). Extract explicit facts (Skills/Interests) AND implicit traits (Values, Communication Style, Motivations).
        2. IF this is the start (history is empty or short), DO NOT ask "What is your name?". 
           Instead, ask: "Hello! To be your true twin, I need to know your mind. Tell me: What is a belief you hold that most people disagree with?" OR "What was the last project that made you lose track of time?"
        3. IF the user gives a shallow answer, gently probe deeper. "That's interesting, but *why* did that matter to you?"
        4. Keep your responses short (max 2 sentences). Be informal and authentic.
        
        OUTPUT FORMAT (JSON):
        {
            "extractedProfile": { 
                "name": "Extract if mentioned", 
                "headline": "Infer a witty headline from their vibe if not explicit", 
                "skills": ["Inferred Skill 1", "Inferred Skill 2"], 
                "interests": ["Inferred Interest 1"],
                "bio": "A narrative synthesis of who they are deep down." 
            },
            "isComplete": boolean (True only if we have a deep sense of them, approx 4-5 turns),
            "nextQuestion": "Your next deep/unconventional question."
        }
        `;

        const result = await model.generateContent(prompt);
        const text = result.response.text();

        // Clean markdown code blocks if present
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const data = JSON.parse(jsonStr);

        return NextResponse.json(data);

    } catch (error) {
        console.error('Interview Logic Error:', error);
        return NextResponse.json({
            nextQuestion: "I'm sorry, I got a bit distracted. Could you repeat that?",
            isComplete: false,
            extractedProfile: {}
        });
    }
}
