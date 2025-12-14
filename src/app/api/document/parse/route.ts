import { NextResponse } from 'next/server';
// @ts-ignore
// const pdf = require('pdf-parse'); // Moved inside
import * as mammoth from 'mammoth';

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json(
                { message: 'No file uploaded' },
                { status: 400 }
            );
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        let text = '';

        if (file.type === 'application/pdf') {
            // @ts-ignore
            const pdf = require('pdf-parse');
            const data = await pdf(buffer);
            text = data.text;
        } else if (
            file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            file.type === 'application/msword'
        ) {
            const result = await mammoth.extractRawText({ buffer });
            text = result.value;
        } else {
            return NextResponse.json(
                { message: 'Unsupported file format. Please upload PDF or DOCX.' },
                { status: 400 }
            );
        }

        // Basic clean up of text
        const cleanedText = text
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 10000); // Limit to reasonable size for Gemini/LLM processing

        return NextResponse.json({
            success: true,
            text: cleanedText
        });

    } catch (error) {
        console.error('Document parsing error:', error);
        return NextResponse.json(
            { message: 'Failed to parse document' },
            { status: 500 }
        );
    }
}
