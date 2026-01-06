'use client';

import { useState, useRef } from 'react';
import { TwinDomain } from '@/domain/entities/Twin';
import { generateProfileEmbedding, preloadEmbeddingModel } from '@/infrastructure/ai/EmbeddingService';
import { TwinInterview } from './TwinInterview';
import { UploadCloud, Link as LinkIcon, FileText, X, Mic, Globe, Shield } from 'lucide-react';
import clsx from 'clsx';

interface TwinFormData {
    name: string;
    headline: string;
    bio: string;
    domain: TwinDomain;
}

interface TwinCreationFormProps {
    onTwinCreated: (twin: {
        name: string;
        headline: string;
        skills: string[];
        interests: string[];
        domain: TwinDomain;
        embedding?: number[];
    }) => void;
    loading?: boolean;
}

function unique(arr: string[]) {
    return Array.from(new Set(arr));
}

function extractSkillsFromText(text: string): string[] {
    const commonSkills = [
        'JavaScript', 'TypeScript', 'Python', 'React', 'Node.js', 'AI', 'ML',
        'Machine Learning', 'Data Science', 'Product Management', 'Agile',
        'Scrum', 'AWS', 'Cloud', 'DevOps', 'Docker', 'Kubernetes', 'Design',
        'UX', 'UI', 'Marketing', 'Sales', 'Strategy', 'Business', 'Leadership'
    ];
    return commonSkills.filter(s => text.toLowerCase().includes(s.toLowerCase()));
}

function extractInterestsFromText(text: string): string[] {
    const commonInterests = [
        'Startups', 'Innovation', 'Tech', 'Entrepreneurship', 'Sustainability',
        'Climate', 'Health', 'Fintech', 'Gaming', 'Music', 'Travel', 'Sports'
    ];
    return commonInterests.filter(i => text.toLowerCase().includes(i.toLowerCase()));
}

export function TwinCreationForm({ onTwinCreated, loading }: TwinCreationFormProps) {
    const [mode, setMode] = useState<'upload' | 'interview'>('upload');
    const [formData, setFormData] = useState<TwinFormData>({
        name: '', headline: '', bio: '', domain: 'networking',
    });
    const [socialLinks, setSocialLinks] = useState<string[]>(['']);
    const [cvFile, setCvFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');
    const [error, setError] = useState<string | null>(null);

    useState(() => {
        preloadEmbeddingModel().catch(console.error);
    });

    const handleLinkChange = (index: number, value: string) => {
        const newLinks = [...socialLinks];
        newLinks[index] = value;
        setSocialLinks(newLinks);
    };

    const addLinkField = () => {
        if (socialLinks.length < 5) setSocialLinks([...socialLinks, '']);
    };

    const removeLinkField = (index: number) => {
        if (socialLinks.length > 1) {
            setSocialLinks(socialLinks.filter((_, i) => i !== index));
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'].includes(file.type)) {
                setCvFile(file);
                setError(null);
            } else {
                setError('Please upload a PDF or DOCX file.');
            }
        }
    };

    const handleInterviewComplete = async (extractedData: { name?: string; headline?: string; skills?: string[]; interests?: string[] }) => {
        const embedding = await generateProfileEmbedding({
            name: extractedData.name || 'Anonymous',
            headline: extractedData.headline || '',
            skills: extractedData.skills || [],
            interests: extractedData.interests || [],
        });

        onTwinCreated({
            name: extractedData.name || "Anonymous",
            headline: extractedData.headline || "Digital Twin User",
            skills: extractedData.skills || [],
            interests: extractedData.interests || [],
            domain: formData.domain,
            embedding,
        });
    };

    const handleConnectSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        const validLinks = socialLinks.filter(l => l.trim().length > 0);

        if (validLinks.length === 0 && !cvFile) {
            setError('Please provide at least one source: A Social Link or CV Upload.');
            return;
        }

        setIsProcessing(true);
        setStatusMessage('Initializing Twin Brain...');

        const extractedData: { name: string; headline: string; skills: string[]; interests: string[]; bioParts: string[]; } = {
            name: '', headline: '', skills: [], interests: [], bioParts: []
        };
        let cvText = '';

        try {
            if (validLinks.length > 0) {
                setStatusMessage(`Scanning ${validLinks.length} social footprint(s)...`);
                const results = await Promise.all(validLinks.map(async (url) => {
                    try {
                        const res = await fetch('/api/social/extract', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ url })
                        });
                        return await res.json();
                    } catch (e) {
                        return null;
                    }
                }));

                for (const res of results) {
                    if (res) {
                        if (res.name && !extractedData.name) extractedData.name = res.name;
                        if (res.headline && !extractedData.headline) extractedData.headline = res.headline;
                        if (res.skills) extractedData.skills.push(...res.skills);
                        if (res.interests) extractedData.interests.push(...res.interests);
                        if (res.bio) extractedData.bioParts.push(res.bio);
                    }
                }
            }

            if (cvFile) {
                setStatusMessage('Reading CV/Resume...');
                const fd = new FormData();
                fd.append('file', cvFile);
                const res = await fetch('/api/document/parse', { method: 'POST', body: fd });
                if (!res.ok) throw new Error('Failed to parse document');
                const data = await res.json();
                cvText = data.text;
                extractedData.bioParts.push(`CV Content: ${cvText.slice(0, 500)}...`);
            }

            setStatusMessage('Synthesizing Identity...');
            const name = extractedData.name || formData.name || "Anonymous User";
            const headline = extractedData.headline || "Digital Networker";
            const cvSkills = extractSkillsFromText(cvText);
            const cvInterests = extractInterestsFromText(cvText);
            const allSkills = unique([...extractedData.skills, ...cvSkills]).slice(0, 15);
            const allInterests = unique([...extractedData.interests, ...cvInterests]).slice(0, 10);

            setStatusMessage('Generating privacy embedding...');
            const embedding = await generateProfileEmbedding({
                name, headline, skills: allSkills, interests: allInterests, bio: extractedData.bioParts.join(' '),
            });

            onTwinCreated({
                name, headline, skills: allSkills, interests: allInterests, domain: formData.domain, embedding,
            });

        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'An error occurred during processing.');
            setIsProcessing(false);
        }
    };

    return (
        <div className="w-full">
            <div className="text-center mb-6">
                <h2 className="text-2xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-white">
                    Create Your Digital Twin
                </h2>
                <p className="text-slate-400 text-sm">Train your personal AI agent to represent you</p>
            </div>

            {/* Domain Selector */}
            <div className="mb-6">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">Primary Goal</label>
                <div className="grid grid-cols-3 gap-2">
                    {(['networking', 'events', 'dating'] as TwinDomain[]).map((domain) => (
                        <button
                            key={domain}
                            type="button"
                            className={clsx(
                                "flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200",
                                formData.domain === domain
                                    ? "bg-cyan-500/20 border-cyan-500 text-white shadow-lg shadow-cyan-500/10"
                                    : "bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:border-white/20 hover:text-white"
                            )}
                            onClick={() => setFormData({ ...formData, domain })}
                        >
                            <span className="text-xl mb-1">{getDomainIcon(domain)}</span>
                            <span className="text-xs font-medium capitalize">{domain}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Mode Selector Tabs */}
            <div className="flex p-1 rounded-xl bg-black/40 mb-6 relative">
                <button
                    className={clsx(
                        "flex-1 py-2 rounded-lg text-sm font-medium transition-all z-10",
                        mode === 'upload' ? "text-white bg-white/10 shadow-sm" : "text-slate-500 hover:text-slate-300"
                    )}
                    onClick={() => setMode('upload')}
                >
                    📤 Data Upload
                </button>
                <button
                    className={clsx(
                        "flex-1 py-2 rounded-lg text-sm font-medium transition-all z-10",
                        mode === 'interview' ? "text-white bg-white/10 shadow-sm" : "text-slate-500 hover:text-slate-300"
                    )}
                    onClick={() => setMode('interview')}
                >
                    🗣️ Voice Interview
                </button>
            </div>

            {error && (
                <div className="p-3 mb-4 rounded-lg bg-red-500/20 border border-red-500/30 text-red-200 text-sm flex items-center gap-2">
                    <X size={16} /> {error}
                </div>
            )}

            {mode === 'interview' ? (
                <div className="bg-white/5 rounded-2xl p-6 border border-white/5 text-center">
                    <p className="text-slate-300 text-sm mb-6">
                        Have a quick chat with your Twin. It will ask you about your background and interests to build your profile.
                    </p>
                    <TwinInterview
                        onInterviewComplete={handleInterviewComplete}
                        currentProfile={{ domain: formData.domain }}
                    />
                </div>
            ) : (
                <form onSubmit={handleConnectSubmit} className="space-y-6">

                    {/* Source 1: Social Links */}
                    <div className="glass-panel p-4 rounded-xl border border-white/5">
                        <div className="flex items-center gap-2 mb-4">
                            <Globe size={18} className="text-cyan-400" />
                            <h3 className="font-semibold text-white text-sm">Social Footprint</h3>
                        </div>
                        <div className="space-y-3">
                            {socialLinks.map((link, idx) => (
                                <div key={idx} className="flex gap-2">
                                    <input
                                        type="url"
                                        value={link}
                                        onChange={(e) => handleLinkChange(idx, e.target.value)}
                                        placeholder="LinkedIn, Twitter, GitHub..."
                                        className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-cyan-500 focus:outline-none transition-colors"
                                    />
                                    {socialLinks.length > 1 && (
                                        <button type="button" onClick={() => removeLinkField(idx)} className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors">
                                            <X size={16} />
                                        </button>
                                    )}
                                </div>
                            ))}
                            {socialLinks.length < 5 && (
                                <button type="button" onClick={addLinkField} className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1">
                                    + Add another source
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-4 py-2">
                        <div className="h-px flex-1 bg-white/10" />
                        <span className="text-xs font-bold text-slate-500">OR</span>
                        <div className="h-px flex-1 bg-white/10" />
                    </div>

                    {/* Source 2: CV Upload */}
                    <div className="glass-panel p-4 rounded-xl border border-white/5">
                        <div className="flex items-center gap-2 mb-4">
                            <FileText size={18} className="text-purple-400" />
                            <h3 className="font-semibold text-white text-sm">Resume / CV</h3>
                        </div>
                        <div
                            className={clsx(
                                "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all",
                                cvFile ? "border-emerald-500/50 bg-emerald-500/5" : "border-white/10 hover:border-purple-500/50 hover:bg-white/5"
                            )}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                accept=".pdf,.doc,.docx"
                                hidden
                            />
                            {cvFile ? (
                                <div className="flex flex-col items-center gap-2">
                                    <FileText className="text-emerald-400" size={24} />
                                    <span className="text-sm font-medium text-emerald-400">{cvFile.name}</span>
                                    <span className="text-xs text-slate-500">(Click to change)</span>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-2">
                                    <UploadCloud className="text-slate-400" size={24} />
                                    <span className="text-sm text-slate-400">Click to upload PDF or DOCX</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isProcessing || loading}
                        className="btn-neon w-full py-3.5 text-base flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40"
                    >
                        {isProcessing ? (
                            <>
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                {statusMessage}
                            </>
                        ) : (
                            <>🚀 Analyze & Create Twin</>
                        )}
                    </button>

                    <div className="flex items-center justify-center gap-2 p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-lg">
                        <Shield size={14} className="text-emerald-400" />
                        <p className="text-xs text-slate-400">
                            <strong className="text-emerald-400">Privacy First</strong>: Data stored on-device only
                        </p>
                    </div>
                </form>
            )}
        </div>
    );
}

function getDomainIcon(domain: TwinDomain): string {
    switch (domain) {
        case 'networking': return '🤝';
        case 'events': return '🎉';
        case 'dating': return '💕';
        default: return '👤';
    }
}
