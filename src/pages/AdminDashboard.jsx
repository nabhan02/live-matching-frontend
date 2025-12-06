import { useState, useEffect } from 'react';
import { adminAPI } from '../services/api';
import './AdminDashboard.css';

const AdminDashboard = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [participants, setParticipants] = useState([]);
    const [matches, setMatches] = useState([]);
    const [uploadStatus, setUploadStatus] = useState('');
    const [matchingStatus, setMatchingStatus] = useState('');
    const [selectedMatches, setSelectedMatches] = useState(new Set());
    const [activeTab, setActiveTab] = useState('upload'); // upload, participants, matches
    const [loginError, setLoginError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [qrCodeParticipant, setQrCodeParticipant] = useState(null);

    const handleLogin = async (e) => {
        e.preventDefault();
        console.log('Login attempt started');
        setLoginError('');

        try {
            console.log('Calling login API...');
            const result = await adminAPI.login(password);
            console.log('Login API response:', result);

            if (result.success) {
                console.log('Login successful, setting authenticated state');
                setIsAuthenticated(true);
                loadParticipants();
            } else {
                console.log('Login failed:', result.message);
                setLoginError(result.message || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            setLoginError('Failed to connect to server');
        }
    };

    const loadParticipants = async () => {
        const data = await adminAPI.getParticipants();
        setParticipants(data);
    };

    const loadMatches = async () => {
        try {
            const data = await adminAPI.getMatches();
            setMatches(data);
        } catch (error) {
            console.error('Error loading matches:', error);
        }
    };

    // Get all participants involved in selected matches
    const getSelectedParticipants = () => {
        const participants = new Set();
        matches.forEach(match => {
            if (selectedMatches.has(match.id)) {
                participants.add(match.name1);
                participants.add(match.name2);
            }
        });
        return participants;
    };

    // Check if selecting a match would create a conflict
    const getConflictingMatch = (matchId) => {
        const match = matches.find(m => m.id === matchId);
        if (!match) return null;

        for (const selectedId of selectedMatches) {
            if (selectedId === matchId) continue;
            const selectedMatch = matches.find(m => m.id === selectedId);
            if (!selectedMatch) continue;

            // Check if any participant appears in both matches
            if (selectedMatch.name1 === match.name1 || selectedMatch.name1 === match.name2 ||
                selectedMatch.name2 === match.name1 || selectedMatch.name2 === match.name2) {
                return selectedMatch;
            }
        }
        return null;
    };

    // Smart select all - only select non-conflicting matches
    const handleSmartSelectAll = () => {
        const newSelected = new Set();
        const usedParticipants = new Set();

        // Sort by score (best matches first)
        const sortedMatches = [...matches]
            .map(match => ({
                ...match,
                score: 100 - ((match.rank1 + match.rank2) * 10)
            }))
            .sort((a, b) => b.score - a.score);

        // Greedily select best matches without conflicts
        sortedMatches.forEach(match => {
            if (!usedParticipants.has(match.name1) && !usedParticipants.has(match.name2)) {
                newSelected.add(match.id);
                usedParticipants.add(match.name1);
                usedParticipants.add(match.name2);
            }
        });

        setSelectedMatches(newSelected);
    };
    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploadStatus('Uploading...');
        const result = await adminAPI.uploadCSV(file);

        if (result.success) {
            setUploadStatus(`Success! Added ${result.participants_added} participants`);
            if (result.errors.length > 0) {
                setUploadStatus(prev => prev + `\nErrors: ${result.errors.join(', ')}`);
            }
            loadParticipants();
        } else {
            setUploadStatus(`Error: ${result.error}`);
        }

        e.target.value = '';
    };

    const handleRunMatching = async () => {
        setMatchingStatus('Running matching algorithm...');
        const result = await adminAPI.runMatching();

        if (result.success) {
            setMatchingStatus(`Success! Found ${result.matches_found} matches`);
            loadMatches();
            setActiveTab('matches');
        } else {
            setMatchingStatus(`Error: ${result.error}`);
        }
    };

    const handleClearAll = async () => {
        if (!confirm('Are you sure you want to clear ALL data? This cannot be undone.')) {
            return;
        }

        await adminAPI.clearAll();
        setParticipants([]);
        setMatches([]);
        setUploadStatus('All data cleared');
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        alert('Link copied to clipboard!');
    };

    const sendEmail = (participant) => {
        const subject = encodeURIComponent('Your Wasilah Matrimonial Event Link');
        const body = encodeURIComponent(
            `Assalamu Alaikum ${participant.first_name},\n\n` +
            `Welcome to the Wasilah Matrimonial Event!\n\n` +
            `Please use the link below to access your unique selection page where you can identify who you are interested:\n\n` +
            `${participant.link}\n\n` +
            `Instructions:\n` +
            `1. Click the link above\n` +
            `2. Select the people you're interested in getting to know\n` +
            `3. Rank them in order of preference\n` +
            `4. Submit your selections\n\n` +
            `The organizers will notify you of any mutual matches.\n\n` +
            `JazakAllah Khair,\n` +
            `Wasilah Team`
        );

        // Create a temporary anchor element and click it
        const mailtoLink = `mailto:${participant.email}?subject=${subject}&body=${body}`;
        const anchor = document.createElement('a');
        anchor.href = mailtoLink;
        anchor.click();
    };

    const sendAllEmails = () => {
        if (!confirm(`This will open ${participants.length} email drafts in your email client. Continue?`)) {
            return;
        }

        // Open emails in batches to avoid overwhelming the system
        participants.forEach((participant, index) => {
            setTimeout(() => {
                sendEmail(participant);
            }, index * 500); // 500ms delay between each email
        });
    };

    const showQRCode = (participant) => {
        setQrCodeParticipant(participant);
    };

    const closeQRCode = () => {
        setQrCodeParticipant(null);
    };

    useEffect(() => {
        if (isAuthenticated && activeTab === 'matches') {
            loadMatches();
        }
    }, [activeTab, isAuthenticated]);

    if (!isAuthenticated) {
        return (
            <div className="login-container">
                <div className="login-card">
                    <h1>🔐 Admin Login</h1>
                    <form onSubmit={handleLogin}>
                        <div className="form-group">
                            <label htmlFor="password">Password</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    id="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter admin password"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={{
                                        position: 'absolute',
                                        right: '0.5rem',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        fontSize: '1.2rem',
                                        padding: '0.25rem',
                                        color: 'var(--text-secondary)'
                                    }}
                                    title={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showPassword ? '🙈' : '👁️'}
                                </button>
                            </div>
                        </div>
                        {loginError && (
                            <div className="error-message">{loginError}</div>
                        )}
                        <button type="submit" className="btn btn-primary">
                            Login
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-dashboard">
            <header className="dashboard-header">
                <h1>🤝 Matrimonial Matcher - Admin Dashboard</h1>
                <button onClick={() => setIsAuthenticated(false)} className="btn btn-secondary">
                    Logout
                </button>
            </header>

            <div className="tabs">
                <button
                    className={`tab ${activeTab === 'upload' ? 'active' : ''}`}
                    onClick={() => setActiveTab('upload')}
                >
                    📤 Upload Participants
                </button>
                <button
                    className={`tab ${activeTab === 'participants' ? 'active' : ''}`}
                    onClick={() => setActiveTab('participants')}
                >
                    👥 Participants ({participants.length})
                </button>
                <button
                    className={`tab ${activeTab === 'matches' ? 'active' : ''}`}
                    onClick={() => setActiveTab('matches')}
                >
                    💑 Matches ({matches.length})
                </button>
            </div>

            <div className="dashboard-content">
                {activeTab === 'upload' && (
                    <div className="upload-section">
                        <h2>Upload Participants CSV</h2>
                        <p>CSV should have columns: <code>id</code>, <code>first_name</code></p>

                        <div className="file-upload">
                            <input
                                type="file"
                                accept=".csv"
                                onChange={handleFileUpload}
                                id="csv-upload"
                                className="file-input"
                            />
                            <label htmlFor="csv-upload" className="btn btn-primary">
                                Choose CSV File
                            </label>
                        </div>

                        {uploadStatus && (
                            <div className="status-message">
                                {uploadStatus}
                            </div>
                        )}

                        {/* Commented out to prevent accidental data loss */}
                        {/*
                        <div className="danger-zone">
                            <h3>⚠️ Danger Zone</h3>
                            <button onClick={handleClearAll} className="btn btn-danger">
                                Clear All Data
                            </button>
                        </div>
                        */}
                    </div>
                )}

                {activeTab === 'participants' && (
                    <div className="participants-section">
                        <h2>Participants & Links</h2>
                        <p>Share these unique links with each participant</p>

                        {participants.length === 0 ? (
                            <p className="empty-state">No participants yet. Upload a CSV to get started.</p>
                        ) : (
                            <>
                                <div style={{ marginBottom: '1rem' }}>
                                    <button onClick={sendAllEmails} className="btn btn-primary">
                                        📧 Send All Emails ({participants.length})
                                    </button>
                                </div>
                                <div className="participants-table">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>ID</th>
                                                <th>Name</th>
                                                <th>Gender</th>
                                                <th>Email</th>
                                                <th>Unique Link</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {participants.map(p => (
                                                <tr key={p.id}>
                                                    <td>{p.id}</td>
                                                    <td>{p.first_name}</td>
                                                    <td>{p.gender === 'female' ? 'Sister' : 'Brother'}</td>
                                                    <td>{p.email}</td>
                                                    <td className="link-cell">
                                                        <code>{p.link}</code>
                                                    </td>
                                                    <td>
                                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                            <button
                                                                onClick={() => copyToClipboard(p.link)}
                                                                className="btn btn-sm btn-secondary"
                                                            >
                                                                📋 Copy
                                                            </button>
                                                            <button
                                                                onClick={() => sendEmail(p)}
                                                                className="btn btn-sm btn-primary"
                                                            >
                                                                📧 Email
                                                            </button>
                                                            <button
                                                                onClick={() => showQRCode(p)}
                                                                className="btn btn-sm btn-secondary"
                                                            >
                                                                📱 QR
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {activeTab === 'matches' && (
                    <div className="matches-section">
                        <h2>Mutual Matches</h2>

                        <button onClick={handleRunMatching} className="btn btn-primary">
                            🔄 Run Matching Algorithm
                        </button>

                        {matchingStatus && (
                            <div className="status-message">
                                {matchingStatus}
                            </div>
                        )}

                        {matches.length > 0 && (
                            <div className="match-summary">
                                <h3>📊 Match Count Summary</h3>
                                <div className="summary-grid">
                                    {(() => {
                                        const matchCounts = {};
                                        const participantIds = {};
                                        const selectedParticipants = getSelectedParticipants();
                                        matches.forEach(match => {
                                            matchCounts[match.name1] = (matchCounts[match.name1] || 0) + 1;
                                            matchCounts[match.name2] = (matchCounts[match.name2] || 0) + 1;
                                            participantIds[match.name1] = match.participant1_id;
                                            participantIds[match.name2] = match.participant2_id;
                                        });
                                        return Object.entries(matchCounts)
                                            .sort((a, b) => b[1] - a[1])
                                            .map(([name, count]) => (
                                                <div key={name} className={`summary-item ${selectedParticipants.has(name) ? 'highlighted' : ''}`}>
                                                    <span className="summary-name">{name} (ID: {participantIds[name]})</span>
                                                    <span className="summary-count">{count} match{count !== 1 ? 'es' : ''}</span>
                                                </div>
                                            ));
                                    })()}
                                </div>
                            </div>
                        )}

                        {matches.length === 0 ? (
                            <p className="empty-state">No matches yet. Run the matching algorithm to find mutual selections.</p>
                        ) : (
                            <>
                                <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                    <button
                                        onClick={() => {
                                            if (selectedMatches.size > 0) {
                                                setSelectedMatches(new Set());
                                            } else {
                                                handleSmartSelectAll();
                                            }
                                        }}
                                        className="btn btn-secondary"
                                    >
                                        {selectedMatches.size > 0 ? '☐ Deselect All' : '☑ Smart Select (No Conflicts)'}
                                    </button>
                                    <span style={{ color: 'var(--text-secondary)' }}>
                                        {selectedMatches.size} of {matches.length} matches selected
                                    </span>
                                    {selectedMatches.size > 0 && (() => {
                                        const participants = getSelectedParticipants();
                                        return (
                                            <span style={{ color: 'var(--primary)', fontWeight: '600' }}>
                                                {participants.size} unique participants
                                            </span>
                                        );
                                    })()}
                                </div>
                                <div className="matches-list">
                                    {matches
                                        .map(match => ({
                                            ...match,
                                            // Higher score is better: 100 - ((rank1 + rank2) * 10)
                                            // Both ranked #1 (0,0) = 100, Both ranked #2 (1,1) = 80, etc.
                                            score: 100 - ((match.rank1 + match.rank2) * 10)
                                        }))
                                        .sort((a, b) => b.score - a.score) // Sort descending (highest first)
                                        .map(match => (
                                            <div key={match.id} className={`match-card ${selectedMatches.has(match.id) ? 'selected' : ''}`}>
                                                <div className="match-checkbox">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedMatches.has(match.id)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                const conflict = getConflictingMatch(match.id);
                                                                if (conflict) {
                                                                    const confirmMsg = `⚠️ Warning: This will create a conflict!\n\n` +
                                                                        `${match.name1} and ${match.name2} are in this match.\n` +
                                                                        `But one of them is already in a selected match with:\n` +
                                                                        `${conflict.name1} ↔ ${conflict.name2}\n\n` +
                                                                        `Do you want to select this match anyway?\n` +
                                                                        `(The conflicting match will be deselected)`;
                                                                    if (!confirm(confirmMsg)) {
                                                                        return;
                                                                    }
                                                                    // Remove the conflicting match
                                                                    const newSelected = new Set(selectedMatches);
                                                                    newSelected.delete(conflict.id);
                                                                    newSelected.add(match.id);
                                                                    setSelectedMatches(newSelected);
                                                                    return;
                                                                }
                                                            }
                                                            const newSelected = new Set(selectedMatches);
                                                            if (e.target.checked) {
                                                                newSelected.add(match.id);
                                                            } else {
                                                                newSelected.delete(match.id);
                                                            }
                                                            setSelectedMatches(newSelected);
                                                        }}
                                                        id={`match-${match.id}`}
                                                    />
                                                    <label htmlFor={`match-${match.id}`}>Select</label>
                                                </div>
                                                <div className="match-header">
                                                    <div className={`match-score ${match.score >= 90 ? 'excellent' : match.score >= 70 ? 'great' : 'good'}`}>
                                                        <div className="score-label">Match Score</div>
                                                        <div className="score-value">{match.score}</div>
                                                        <div className="score-subtitle">
                                                            {match.score >= 90 ? '🔥 Excellent' : match.score >= 70 ? '⭐ Great' : '👍 Good'}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="match-participants">
                                                    <div className="match-person">
                                                        <span className="participant-name">{match.name1}</span>
                                                        <span className="participant-id">ID: {match.participant1_id}</span>
                                                        <span className="rank-badge">Ranked #{match.rank1 + 1}</span>
                                                    </div>
                                                    <span className="match-icon">💕</span>
                                                    <div className="match-person">
                                                        <span className="participant-name">{match.name2}</span>
                                                        <span className="participant-id">ID: {match.participant2_id}</span>
                                                        <span className="rank-badge">Ranked #{match.rank2 + 1}</span>
                                                    </div>
                                                </div>
                                                <div className="match-note">
                                                    {match.name1} ranked {match.name2} as #{match.rank1 + 1} choice • {match.name2} ranked {match.name1} as #{match.rank2 + 1} choice
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* QR Code Modal */}
            {qrCodeParticipant && (
                <div className="modal-overlay" onClick={closeQRCode}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>📱 QR Code for {qrCodeParticipant.first_name}</h2>
                            <button onClick={closeQRCode} className="modal-close">✕</button>
                        </div>
                        <div className="modal-body">
                            <div className="qr-code-container">
                                <img
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrCodeParticipant.link)}`}
                                    alt="QR Code"
                                    className="qr-code-image"
                                />
                            </div>
                            <p className="qr-instructions">
                                Scan this QR code to access the selection page for {qrCodeParticipant.first_name}
                            </p>
                            <div className="qr-link">
                                <code>{qrCodeParticipant.link}</code>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
