'use client';

import { useState, useRef } from 'react';
import { TwinDomain } from '@/domain/entities/Twin';
import {
    extractLinkedInProfile,
    isValidLinkedInUrl,
    ExtractedProfile
} from '@/application/services/LinkedInExtractor';
import { TwinInterview } from './TwinInterview';

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
    }) => void;
    loading?: boolean;
}

// Function to get distinct skills/interests
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

/**
 * TwinCreationForm - Onboarding with multiple data sources
 * Supports Multi-Social Links sent to /api/social/extract
 */
export function TwinCreationForm({ onTwinCreated, loading }: TwinCreationFormProps) {
    const [mode, setMode] = useState<'upload' | 'interview'>('upload');
    const [formData, setFormData] = useState<TwinFormData>({
        name: '',
        headline: '',
        bio: '',
        domain: 'networking',
    });

    // Multi-Social State
    const [socialLinks, setSocialLinks] = useState<string[]>(['']);

    const [cvFile, setCvFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');
    const [error, setError] = useState<string | null>(null);

    // Handlers for Social Links
    const handleLinkChange = (index: number, value: string) => {
        const newLinks = [...socialLinks];
        newLinks[index] = value;
        setSocialLinks(newLinks);
    };

    const addLinkField = () => {
        if (socialLinks.length < 5) {
            setSocialLinks([...socialLinks, '']);
        }
    };

    const removeLinkField = (index: number) => {
        if (socialLinks.length > 1) {
            const newLinks = socialLinks.filter((_, i) => i !== index);
            setSocialLinks(newLinks);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.type === 'application/pdf' ||
                file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                file.type === 'application/msword') {
                setCvFile(file);
                setError(null);
            } else {
                setError('Please upload a PDF or DOCX file.');
            }
        }
    };

    const handleInterviewComplete = (extractedData: any) => {
        onTwinCreated({
            name: extractedData.name || "Anonymous",
            headline: extractedData.headline || "Digital Twin User",
            skills: extractedData.skills || [],
            interests: extractedData.interests || [],
            domain: formData.domain,
        });
    };

    const handleConnectSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const validLinks = socialLinks.filter(l => l.trim().length > 0);

        // Validation: At least one source
        if (validLinks.length === 0 && !cvFile) {
            setError('Please provide at least one source: A Social Link or CV Upload.');
            return;
        }

        setIsProcessing(true);
        setStatusMessage('Initializing Twin Brain...');

        let extractedData: any = {
            name: '',
            headline: '',
            skills: [] as string[],
            interests: [] as string[],
            bioParts: [] as string[]
        };
        let cvText = '';

        try {
            // 1. Process Social Links (Parallel)
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
                        console.error("Failed to extract", url, e);
                        return null;
                    }
                }));

                // Merge Results
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

            // 2. Process CV if provided
            if (cvFile) {
                setStatusMessage('Reading CV/Resume...');
                const fd = new FormData();
                fd.append('file', cvFile);

                const res = await fetch('/api/document/parse', {
                    method: 'POST',
                    body: fd,
                });

                if (!res.ok) throw new Error('Failed to parse document');
                const data = await res.json();
                cvText = data.text;
                extractedData.bioParts.push(`CV Content: ${cvText.slice(0, 500)}...`);
            }

            // 3. Synthesize
            setStatusMessage('Synthesizing Identity...');

            const name = extractedData.name || formData.name || "Anonymous User";
            const headline = extractedData.headline || "Digital Networker";

            // Merge skills from all sources + CV text
            const cvSkills = extractSkillsFromText(cvText);
            const cvInterests = extractInterestsFromText(cvText);

            const allSkills = unique([...extractedData.skills, ...cvSkills]).slice(0, 15);
            const allInterests = unique([...extractedData.interests, ...cvInterests]).slice(0, 10);

            onTwinCreated({
                name,
                headline,
                skills: allSkills,
                interests: allInterests,
                domain: formData.domain,
            });

        } catch (err: any) {
            setError(err.message || 'An error occurred during processing.');
            setIsProcessing(false);
        }
    };

    return (
        <div className="twin-form">
            <div className="form-header">
                <h2>Create Your Digital Twin</h2>
                <p>Train your personal AI agent to represent you</p>
            </div>

            {/* Domain Selector */}
            <div className="domain-selector">
                <label>Primary Goal</label>
                <div className="domain-buttons">
                    {(['networking', 'events', 'dating'] as TwinDomain[]).map((domain) => (
                        <button
                            key={domain}
                            type="button"
                            className={`domain-btn ${formData.domain === domain ? 'active' : ''}`}
                            onClick={() => setFormData({ ...formData, domain })}
                        >
                            {getDomainIcon(domain)} {domain.charAt(0).toUpperCase() + domain.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Mode Selector Tabs */}
            <div className="mode-tabs">
                <button
                    className={`mode-tab ${mode === 'upload' ? 'active' : ''}`}
                    onClick={() => setMode('upload')}
                >
                    📤 Data Upload
                </button>
                <button
                    className={`mode-tab ${mode === 'interview' ? 'active' : ''}`}
                    onClick={() => setMode('interview')}
                >
                    🗣️ Voice Interview
                </button>
            </div>

            {error && <div className="error-message">⚠️ {error}</div>}

            {mode === 'interview' ? (
                <div className="interview-container">
                    <p className="interview-intro">
                        Have a quick chat with your Twin. It will ask you about your background and interests to build your profile.
                    </p>
                    <TwinInterview
                        onInterviewComplete={handleInterviewComplete}
                        currentProfile={{ domain: formData.domain }}
                    />
                </div>
            ) : (
                <form onSubmit={handleConnectSubmit} className="connect-form">

                    {/* Source 1: Social Links (Multi) */}
                    <div className="source-section">
                        <div className="section-header">
                            <span className="icon">🌐</span>
                            <h3>Social Footprint</h3>
                        </div>
                        <div className="links-list">
                            {socialLinks.map((link, idx) => (
                                <div key={idx} className="input-group link-row">
                                    <input
                                        type="url"
                                        value={link}
                                        onChange={(e) => handleLinkChange(idx, e.target.value)}
                                        placeholder="LinkedIn, Twitter, Instagram..."
                                        className="url-input"
                                    />
                                    {socialLinks.length > 1 && (
                                        <button type="button" className="remove-btn" onClick={() => removeLinkField(idx)}>×</button>
                                    )}
                                </div>
                            ))}
                            {socialLinks.length < 5 && (
                                <button type="button" className="add-btn" onClick={addLinkField}>+ Add another source</button>
                            )}
                        </div>
                        <p className="input-hint">We support LinkedIn, Twitter, Instagram, GitHub...</p>
                    </div>

                    <div className="divider">
                        <span>AND / OR</span>
                    </div>

                    {/* Source 2: CV Upload */}
                    <div className="source-section">
                        <div className="section-header">
                            <span className="icon">📄</span>
                            <h3>Resume / CV</h3>
                        </div>
                        <div
                            className={`file-drop-area ${cvFile ? 'has-file' : ''}`}
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
                                <div className="file-info">
                                    <span className="filename">{cvFile.name}</span>
                                    <span className="change-text">(Click to change)</span>
                                </div>
                            ) : (
                                <div className="upload-prompt">
                                    <span>Click to upload PDF or DOCX</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isProcessing || loading}
                        className="submit-btn"
                    >
                        {isProcessing ? (
                            <span className="processing-status">
                                <span className="spinner">⚡</span> {statusMessage}
                            </span>
                        ) : (
                            '🚀 Analyze & Create Twin'
                        )}
                    </button>

                    <div className="privacy-shield">
                        <span className="shield-icon">🛡️</span>
                        <div className="shield-text">
                            <strong>Privacy First</strong>
                            <small>Data encrypted & stored on-device only</small>
                        </div>
                    </div>
                </form>
            )}

            <style jsx>{`
                .twin-form {
                    max-width: 520px;
                    margin: 0 auto;
                    padding: 2rem;
                    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                    border-radius: 24px;
                    color: white;
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                }
                .form-header {
                    text-align: center;
                    margin-bottom: 2rem;
                }
                .form-header h2 {
                    font-size: 1.75rem;
                    font-weight: 700;
                    margin-bottom: 0.5rem;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }
                .form-header p {
                    color: rgba(255, 255, 255, 0.7);
                }
                .domain-selector {
                    margin-bottom: 1.5rem;
                }
                .domain-selector label {
                    display: block;
                    margin-bottom: 0.75rem;
                    font-weight: 500;
                    color: rgba(255, 255, 255, 0.9);
                }
                .domain-buttons {
                    display: flex;
                    gap: 0.5rem;
                }
                .domain-btn {
                    flex: 1;
                    padding: 0.75rem;
                    background: rgba(255, 255, 255, 0.1);
                    border: 2px solid transparent;
                    border-radius: 8px;
                    color: white;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .domain-btn.active {
                    background: rgba(102, 126, 234, 0.2);
                    border-color: #667eea;
                }
                .mode-tabs {
                    display: flex;
                    margin-bottom: 1.5rem;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                }
                .mode-tab {
                    flex: 1;
                    padding: 1rem;
                    background: transparent;
                    border: none;
                    border-bottom: 2px solid transparent;
                    color: rgba(255, 255, 255, 0.6);
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .mode-tab:hover {
                    color: white;
                }
                .mode-tab.active {
                    color: #667eea;
                    border-bottom-color: #667eea;
                }
                .source-section {
                    background: rgba(255, 255, 255, 0.05);
                    padding: 1rem;
                    border-radius: 12px;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                }
                .section-header {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    margin-bottom: 0.75rem;
                }
                .section-header h3 {
                    font-size: 1rem;
                    font-weight: 600;
                    margin: 0;
                }
                .input-group {
                    margin-bottom: 0.5rem;
                }
                .link-row {
                    display: flex;
                    gap: 0.5rem;
                }
                .url-input {
                    flex: 1;
                    padding: 0.875rem;
                    background: rgba(0, 0, 0, 0.2);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    border-radius: 8px;
                    color: white;
                }
                .remove-btn {
                    padding: 0 0.75rem;
                    background: rgba(239, 68, 68, 0.2);
                    color: #fca5a5;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 1.25rem;
                }
                .add-btn {
                    background: transparent;
                    border: 1px dashed rgba(255, 255, 255, 0.3);
                    color: rgba(255, 255, 255, 0.7);
                    width: 100%;
                    padding: 0.5rem;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 0.875rem;
                    transition: all 0.2s;
                }
                .add-btn:hover {
                    border-color: #667eea;
                    color: white;
                }
                .input-hint {
                    font-size: 0.75rem;
                    color: rgba(255, 255, 255, 0.4);
                    margin-top: 0.5rem;
                }

                .file-drop-area {
                    border: 2px dashed rgba(255, 255, 255, 0.2);
                    border-radius: 8px;
                    padding: 1.5rem;
                    text-align: center;
                    cursor: pointer;
                    transition: all 0.2s;
                    background: rgba(0, 0, 0, 0.2);
                }
                .file-drop-area:hover {
                    border-color: #667eea;
                    background: rgba(102, 126, 234, 0.1);
                }
                .file-drop-area.has-file {
                    border-style: solid;
                    border-color: #4ade80;
                    background: rgba(74, 222, 128, 0.1);
                }
                .filename {
                    font-weight: 600;
                    color: #4ade80;
                    display: block;
                }
                .change-text {
                    font-size: 0.75rem;
                    color: rgba(255, 255, 255, 0.6);
                }
                .divider {
                    text-align: center;
                    margin: 1rem 0;
                    position: relative;
                }
                .divider span {
                    background: #1a1a2e;
                    padding: 0 1rem;
                    color: rgba(255, 255, 255, 0.5);
                    font-size: 0.75rem;
                    font-weight: 600;
                }
                .divider::before {
                    content: '';
                    position: absolute;
                    left: 0;
                    top: 50%;
                    width: 100%;
                    height: 1px;
                    background: rgba(255, 255, 255, 0.1);
                    z-index: -1;
                }
                .submit-btn {
                    width: 100%;
                    padding: 1rem;
                    margin-top: 1.5rem;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    border: none;
                    border-radius: 8px;
                    color: white;
                    font-size: 1.125rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: transform 0.2s;
                }
                .submit-btn:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: 0 10px 30px rgba(102, 126, 234, 0.4);
                }
                .submit-btn:disabled {
                    opacity: 0.7;
                    cursor: wait;
                }
                .error-message {
                    background: rgba(239, 68, 68, 0.2);
                    color: #fca5a5;
                    padding: 0.75rem;
                    border-radius: 8px;
                    margin-bottom: 1rem;
                    font-size: 0.875rem;
                }
                .privacy-shield {
                    margin-top: 1.5rem;
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    padding: 0.75rem;
                    background: rgba(16, 185, 129, 0.1);
                    border: 1px solid rgba(16, 185, 129, 0.2);
                    border-radius: 12px;
                }
                .shield-icon {
                    font-size: 1.5rem;
                }
                .shield-text {
                    display: flex;
                    flex-direction: column;
                }
                .shield-text strong {
                    color: #34d399;
                    font-size: 0.875rem;
                }
                .shield-text small {
                    color: rgba(255, 255, 255, 0.6);
                    font-size: 0.75rem;
                }
                .interview-intro {
                    text-align: center;
                    opacity: 0.8;
                    font-size: 0.9rem;
                    margin-bottom: 1rem;
                }
            `}</style>
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
