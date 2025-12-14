'use client';

import { useState, useRef } from 'react';
import { TwinDomain } from '@/domain/entities/Twin';
import {
  extractLinkedInProfile,
  parseManualProfile,
  isValidLinkedInUrl,
  ExtractedProfile
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
 * TwinCreationForm - Onboarding with multiple data sources
 * Supports LinkedIn URL and/or CV Upload
 */
export function TwinCreationForm({ onTwinCreated, loading }: TwinCreationFormProps) {
  const [step, setStep] = useState<'connect' | 'confirm'>('connect');
  const [formData, setFormData] = useState<TwinFormData>({
    linkedinUrl: '',
    name: '',
    headline: '',
    bio: '',
    domain: 'networking',
  });
  const [cvFile, setCvFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

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

  const handleConnectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation: At least one source
    if (!formData.linkedinUrl && !cvFile) {
      setError('Please provide at least one source: LinkedIn URL or CV Upload.');
      return;
    }

    if (formData.linkedinUrl && !isValidLinkedInUrl(formData.linkedinUrl)) {
      setError('Invalid LinkedIn URL format.');
      return;
    }

    setIsProcessing(true);
    setStatusMessage('Initializing Twin Brain...');

    let linkedInProfile: ExtractedProfile | null = null;
    let cvText = '';

    try {
      // 1. Process LinkedIn if provided
      if (formData.linkedinUrl) {
        setStatusMessage('Scraping LinkedIn Profile...');
        const result = await extractLinkedInProfile(formData.linkedinUrl);
        if (result.success && result.profile) {
          linkedInProfile = result.profile;
        } else {
          console.warn('LinkedIn extraction failed:', result.error);
          // Don't fail hard if we have a CV, just warn?
          if (!cvFile) {
            throw new Error(result.error || 'Failed to extract LinkedIn profile');
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
      }

      // 3. Merge Data
      setStatusMessage('Synthesizing Identity...');

      // Prefer LinkedIn for structured data, fallback to CV cues (would need LLM parsing really, 
      // but for now we mix them or rely on what we have)

      // If we only have CV, we might need to parse name/headline from it or ask user.
      // For this MVP, if only CV, we default name/headline if not parseable?
      // Let's assume user might correct it in next step if we had one, but we jump to finding.

      const name = linkedInProfile?.name || formData.name || "Anonymous User";
      const headline = linkedInProfile?.headline || "Professional";

      // Merge skills
      const linkedInSkills = linkedInProfile?.skills || [];
      // Simple extraction from CV text for demo (in real app, send CV text to LLM to extract skills)
      const cvSkills = extractSkillsFromText(cvText);

      const allSkills = Array.from(new Set([...linkedInSkills, ...cvSkills])).slice(0, 15);

      const combinedBio = [
        linkedInProfile?.name ? `LinkedIn Bio: ${linkedInProfile.name}` : '',
        cvText ? `CV Content: ${cvText.slice(0, 500)}...` : ''
      ].join('\n\n');

      onTwinCreated({
        name,
        headline,
        skills: allSkills,
        interests: linkedInProfile?.interests || extractInterestsFromText(cvText),
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
        <p>Upload your data to train your personal AI agent</p>
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

      {error && <div className="error-message">⚠️ {error}</div>}

      <form onSubmit={handleConnectSubmit} className="connect-form">

        {/* Source 1: LinkedIn */}
        <div className="source-section">
          <div className="section-header">
            <span className="icon">🔗</span>
            <h3>LinkedIn Profile</h3>
          </div>
          <div className="input-group">
            <input
              type="url"
              value={formData.linkedinUrl}
              onChange={(e) => setFormData({ ...formData, linkedinUrl: e.target.value })}
              placeholder="https://linkedin.com/in/yourprofile"
              className="url-input"
            />
          </div>
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

        <p className="privacy-note">
          🔒 Data is processed locally or via secure APIs. Your twin runs on your device.
        </p>
      </form>

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
                    margin-bottom: 2rem;
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
                .url-input {
                    width: 100%;
                    padding: 0.875rem;
                    background: rgba(0, 0, 0, 0.2);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    border-radius: 8px;
                    color: white;
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
                .privacy-note {
                    text-align: center;
                    font-size: 0.75rem;
                    color: rgba(255, 255, 255, 0.4);
                    margin-top: 1rem;
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

// Helper functions (duplicated from previous implementation due to simplicity)
// Ideally move to a shared utility
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
