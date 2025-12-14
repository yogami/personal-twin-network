'use client';

import { useState } from 'react';
import { TwinDomain } from '@/domain/entities/Twin';
import {
    extractLinkedInProfile,
    parseManualProfile,
    isValidLinkedInUrl
} from '@/application/services/LinkedInExtractor';

interface TwinFormData {
    linkedinUrl: string;
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

/**
 * TwinCreationForm - 30-second onboarding form
 * LinkedIn URL extraction with manual fallback
 */
export function TwinCreationForm({ onTwinCreated, loading }: TwinCreationFormProps) {
    const [step, setStep] = useState<'linkedin' | 'manual'>('linkedin');
    const [formData, setFormData] = useState<TwinFormData>({
        linkedinUrl: '',
        name: '',
        headline: '',
        bio: '',
        domain: 'networking',
    });
    const [isExtracting, setIsExtracting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLinkedInSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsExtracting(true);

        if (!isValidLinkedInUrl(formData.linkedinUrl)) {
            setError('Please enter a valid LinkedIn URL');
            setIsExtracting(false);
            return;
        }

        const result = await extractLinkedInProfile(formData.linkedinUrl);
        setIsExtracting(false);

        if (result.success && result.profile) {
            onTwinCreated({
                name: result.profile.name,
                headline: result.profile.headline,
                skills: result.profile.skills,
                interests: result.profile.interests,
                domain: formData.domain,
            });
        } else {
            setError(result.error || 'Failed to extract profile. Try manual entry.');
            setStep('manual');
        }
    };

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!formData.name.trim()) {
            setError('Name is required');
            return;
        }

        const profile = parseManualProfile(formData.name, formData.headline, formData.bio);
        onTwinCreated({
            ...profile,
            domain: formData.domain,
        });
    };

    return (
        <div className="twin-form">
            <div className="form-header">
                <h2>Create Your Digital Twin</h2>
                <p>30 seconds to your perfect networking matches</p>
            </div>

            {/* Domain Selector */}
            <div className="domain-selector">
                <label>What are you here for?</label>
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

            {error && <div className="error-message">⚠️ {error}</div>}

            {step === 'linkedin' ? (
                <form onSubmit={handleLinkedInSubmit} className="linkedin-form">
                    <div className="input-group">
                        <label>LinkedIn Profile URL</label>
                        <input
                            type="url"
                            value={formData.linkedinUrl}
                            onChange={(e) => setFormData({ ...formData, linkedinUrl: e.target.value })}
                            placeholder="https://linkedin.com/in/yourprofile"
                            className="url-input"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isExtracting || loading}
                        className="submit-btn"
                    >
                        {isExtracting ? '✨ Extracting Profile...' : '🚀 Create Twin'}
                    </button>

                    <button
                        type="button"
                        onClick={() => setStep('manual')}
                        className="switch-btn"
                    >
                        Enter details manually instead
                    </button>
                </form>
            ) : (
                <form onSubmit={handleManualSubmit} className="manual-form">
                    <div className="input-group">
                        <label>Your Name</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="John Doe"
                            className="text-input"
                        />
                    </div>

                    <div className="input-group">
                        <label>Headline / Title</label>
                        <input
                            type="text"
                            value={formData.headline}
                            onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
                            placeholder="Software Engineer at StartupXYZ"
                            className="text-input"
                        />
                    </div>

                    <div className="input-group">
                        <label>About You (skills, interests, what you're looking for)</label>
                        <textarea
                            value={formData.bio}
                            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                            placeholder="I work on AI/ML projects, interested in startups and tech innovation. Looking to meet founders and engineers..."
                            className="bio-input"
                            rows={4}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="submit-btn"
                    >
                        {loading ? '✨ Creating Twin...' : '🚀 Create Twin'}
                    </button>

                    <button
                        type="button"
                        onClick={() => setStep('linkedin')}
                        className="switch-btn"
                    >
                        Use LinkedIn instead
                    </button>
                </form>
            )}

            <style jsx>{`
        .twin-form {
          max-width: 480px;
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
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .form-header p {
          color: rgba(255, 255, 255, 0.7);
          margin-top: 0.5rem;
        }
        .domain-selector {
          margin-bottom: 1.5rem;
        }
        .domain-selector label {
          display: block;
          margin-bottom: 0.75rem;
          font-weight: 500;
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
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .domain-btn:hover {
          background: rgba(255, 255, 255, 0.15);
        }
        .domain-btn.active {
          border-color: #667eea;
          background: rgba(102, 126, 234, 0.2);
        }
        .error-message {
          padding: 0.75rem;
          background: rgba(239, 68, 68, 0.2);
          border-radius: 8px;
          margin-bottom: 1rem;
          font-size: 0.875rem;
        }
        .input-group {
          margin-bottom: 1rem;
        }
        .input-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-size: 0.875rem;
          color: rgba(255, 255, 255, 0.8);
        }
        .url-input, .text-input, .bio-input {
          width: 100%;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          color: white;
          font-size: 1rem;
          transition: border-color 0.2s;
        }
        .url-input:focus, .text-input:focus, .bio-input:focus {
          outline: none;
          border-color: #667eea;
        }
        .url-input::placeholder, .text-input::placeholder, .bio-input::placeholder {
          color: rgba(255, 255, 255, 0.4);
        }
        .bio-input {
          resize: vertical;
          min-height: 100px;
        }
        .submit-btn {
          width: 100%;
          padding: 1rem;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: none;
          border-radius: 8px;
          color: white;
          font-size: 1.125rem;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
          margin-top: 0.5rem;
        }
        .submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(102, 126, 234, 0.4);
        }
        .submit-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        .switch-btn {
          width: 100%;
          padding: 0.75rem;
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.6);
          font-size: 0.875rem;
          cursor: pointer;
          margin-top: 0.5rem;
        }
        .switch-btn:hover {
          color: white;
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
