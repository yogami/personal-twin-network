/**
 * Admin Seed API
 * 
 * Seeds fake CIC attendees for demo purposes.
 */

import { NextResponse } from 'next/server';

export interface SeedAttendee {
    id: string;
    name: string;
    headline: string;
    skills: string[];
    interests: string[];
    embedding: number[];
}

// Fake CIC attendees for demo
const SEED_ATTENDEES: SeedAttendee[] = [
    {
        id: 'seed-anna',
        name: 'Dr. Anna Schmidt',
        headline: 'AI Researcher at TU Berlin',
        skills: ['Machine Learning', 'Python', 'Research'],
        interests: ['AI/ML', 'Climate', 'Startups'],
        embedding: [0.9, 0.2, 0.3, 0.1, 0.8],
    },
    {
        id: 'seed-max',
        name: 'Max Weber',
        headline: 'Startup Founder (FinTech)',
        skills: ['Product Management', 'Finance', 'Strategy'],
        interests: ['FinTech', 'Investing', 'Startups'],
        embedding: [0.3, 0.9, 0.2, 0.7, 0.4],
    },
    {
        id: 'seed-sophie',
        name: 'Sophie Klein',
        headline: 'UX Designer at Zalando',
        skills: ['UX Design', 'Figma', 'User Research'],
        interests: ['Design', 'Product', 'HealthTech'],
        embedding: [0.2, 0.3, 0.9, 0.4, 0.5],
    },
    {
        id: 'seed-leo',
        name: 'Leo Braun',
        headline: 'CTO at GreenTech Startup',
        skills: ['Engineering', 'TypeScript', 'System Design'],
        interests: ['Climate', 'Engineering', 'AI/ML'],
        embedding: [0.7, 0.4, 0.2, 0.3, 0.9],
    },
    {
        id: 'seed-mia',
        name: 'Mia Fischer',
        headline: 'VC Partner at Berlin Ventures',
        skills: ['Investment', 'Due Diligence', 'Board Advisory'],
        interests: ['Investing', 'Startups', 'FinTech'],
        embedding: [0.4, 0.8, 0.3, 0.9, 0.2],
    },
    {
        id: 'seed-thomas',
        name: 'Thomas Müller',
        headline: 'Head of Product at N26',
        skills: ['Product Strategy', 'Agile', 'Growth'],
        interests: ['Product', 'FinTech', 'Sales'],
        embedding: [0.5, 0.6, 0.4, 0.7, 0.3],
    },
    {
        id: 'seed-emma',
        name: 'Emma Hoffmann',
        headline: 'ML Engineer at DeepMind',
        skills: ['Deep Learning', 'PyTorch', 'Research'],
        interests: ['AI/ML', 'Engineering', 'HealthTech'],
        embedding: [0.95, 0.1, 0.2, 0.15, 0.85],
    },
    {
        id: 'seed-jan',
        name: 'Jan Becker',
        headline: 'Founder of ClimateTech Accelerator',
        skills: ['Entrepreneurship', 'Sustainability', 'Mentoring'],
        interests: ['Climate', 'Startups', 'Investing'],
        embedding: [0.6, 0.5, 0.3, 0.4, 0.7],
    },
    {
        id: 'seed-laura',
        name: 'Laura Schneider',
        headline: 'Sales Director at SAP',
        skills: ['Enterprise Sales', 'Account Management', 'SaaS'],
        interests: ['Sales', 'Product', 'AI/ML'],
        embedding: [0.3, 0.7, 0.5, 0.6, 0.4],
    },
    {
        id: 'seed-niklas',
        name: 'Niklas Wagner',
        headline: 'Health Tech Entrepreneur',
        skills: ['Healthcare', 'Product', 'Strategy'],
        interests: ['HealthTech', 'Startups', 'AI/ML'],
        embedding: [0.4, 0.3, 0.6, 0.5, 0.7],
    },
];

export async function GET() {
    return NextResponse.json({
        success: true,
        attendees: SEED_ATTENDEES,
        count: SEED_ATTENDEES.length,
    });
}

export async function POST() {
    // In a real implementation, this would seed to Supabase
    // For demo, we just return success
    return NextResponse.json({
        success: true,
        seeded: SEED_ATTENDEES.length,
        message: 'Demo attendees ready for matching',
    });
}
