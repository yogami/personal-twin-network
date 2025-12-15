import { NextResponse } from 'next/server';
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
            // For PDF: Return mock text since pdf-parse has DOM dependency issues
            // In production, use a PDF service or different library
            text = `[PDF Content from ${file.name}] - PDF parsing not available in serverless environment. Please use DOCX format or provide the text manually.`;
        } else if (
            file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            file.type === 'application/msword'
        ) {
            const result = await mammoth.extractRawText({ buffer });
            text = result.value;
        } else {
            return NextResponse.json(
                { message: 'Unsupported file type. Please upload PDF or DOCX.' },
                { status: 400 }
            );
        }

        // Clean up extracted text
        text = text
            .replace(/\s+/g, ' ')
            .replace(/\n+/g, '\n')
            .trim();

        return NextResponse.json({
            text: text.substring(0, 10000), // Limit to 10k chars
            filename: file.name,
            type: file.type,
        });

    } catch (error) {
        console.error('Document parse error:', error);
        return NextResponse.json(
            { message: 'Failed to parse document' },
            { status: 500 }
        );
    }
}
