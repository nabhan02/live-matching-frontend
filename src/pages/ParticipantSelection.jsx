import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { participantAPI } from '../services/api';
import './ParticipantSelection.css';

const ParticipantSelection = () => {
    const { token } = useParams();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [participant, setParticipant] = useState(null);
    const [availableParticipants, setAvailableParticipants] = useState([]);
    const [selectedParticipants, setSelectedParticipants] = useState([]); // Array of {id, name, rank}
    const [submitted, setSubmitted] = useState(false);

    useEffect(() => {
        loadParticipantData();
    }, [token]);

    const loadParticipantData = async () => {
        try {
            const data = await participantAPI.getParticipantData(token);

            if (data.error) {
                setError(data.error);
            } else {
                setParticipant(data.participant);
                setAvailableParticipants(data.available_participants);

                // Load existing selections with ranks
                if (data.current_selections && data.current_selections.length > 0) {
                    const selected = data.current_selections.map(sel => {
                        const person = data.available_participants.find(p => p.id === sel.selected_id);
                        return {
                            id: sel.selected_id,
                            name: person?.first_name || 'Unknown',
                            rank: sel.rank
                        };
                    }).sort((a, b) => a.rank - b.rank);
                    setSelectedParticipants(selected);
                }
            }
        } catch (err) {
            setError('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const toggleSelection = (person) => {
        const isSelected = selectedParticipants.some(p => p.id === person.id);

        if (isSelected) {
            // Remove from selected
            setSelectedParticipants(selectedParticipants.filter(p => p.id !== person.id));
        } else {
            // Add to selected with next rank
            setSelectedParticipants([...selectedParticipants, {
                id: person.id,
                name: person.first_name,
                rank: selectedParticipants.length
            }]);
        }
    };

    const moveUp = (index) => {
        if (index === 0) return;
        const newSelected = [...selectedParticipants];
        [newSelected[index - 1], newSelected[index]] = [newSelected[index], newSelected[index - 1]];
        // Update ranks
        newSelected.forEach((p, i) => p.rank = i);
        setSelectedParticipants(newSelected);
    };

    const moveDown = (index) => {
        if (index === selectedParticipants.length - 1) return;
        const newSelected = [...selectedParticipants];
        [newSelected[index], newSelected[index + 1]] = [newSelected[index + 1], newSelected[index]];
        // Update ranks
        newSelected.forEach((p, i) => p.rank = i);
        setSelectedParticipants(newSelected);
    };

    const handleSubmit = async () => {
        if (selectedParticipants.length === 0) {
            alert('Please select at least one person');
            return;
        }

        if (!confirm(`Submit ${selectedParticipants.length} selection(s) with rankings?`)) {
            return;
        }

        try {
            const selections = selectedParticipants.map(p => ({
                id: p.id,
                rank: p.rank
            }));

            const result = await participantAPI.submitSelections(token, selections);

            if (result.success) {
                setSubmitted(true);
            } else {
                alert(`Error: ${result.error}`);
            }
        } catch (err) {
            alert('Failed to submit selections');
        }
    };

    if (loading) {
        return (
            <div className="participant-container">
                <div className="loading">Loading...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="participant-container">
                <div className="error-card">
                    <h2>❌ Error</h2>
                    <p>{error}</p>
                    <p>Please check your link and try again.</p>
                </div>
            </div>
        );
    }

    if (submitted) {
        return (
            <div className="participant-container">
                <div className="success-card">
                    <h1>✅ Selections Submitted!</h1>
                    <p>Thank you, {participant.first_name}!</p>
                    <p>You selected {selectedParticipants.length} {selectedParticipants.length === 1 ? 'person' : 'people'}.</p>
                    <p className="note">The event organizer will run the matching algorithm and notify you of any mutual matches.</p>
                    <button onClick={() => setSubmitted(false)} className="btn btn-secondary">
                        Edit Selections
                    </button>
                </div>
            </div>
        );
    }

    const isSelected = (id) => selectedParticipants.some(p => p.id === id);

    return (
        <div className="participant-container">
            <div className="participant-card">
                <h1>🤝 Matrimonial Event</h1>
                <h2>Welcome, {participant.first_name}!</h2>
                <p className="instructions">
                    Select people you're interested in, then rank them in order of preference.
                    If they select you too, it's a match! 💕
                </p>

                <div className="selection-stats">
                    <span>Selected: {selectedParticipants.length} / {availableParticipants.length}</span>
                </div>

                <div className="two-column-layout">
                    {/* Available Participants */}
                    <div className="column">
                        <h3>Available</h3>
                        <div className="participants-list">
                            {availableParticipants.map(p => (
                                <div
                                    key={p.id}
                                    className={`participant-item ${isSelected(p.id) ? 'selected' : ''}`}
                                    onClick={() => toggleSelection(p)}
                                >
                                    <div className="participant-info">
                                        <span className="participant-name">{p.first_name}</span>
                                        <span className="participant-id">ID: {p.id}</span>
                                    </div>
                                    <div className="checkbox">
                                        {isSelected(p.id) ? '✓' : '+'}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Selected & Ranked */}
                    <div className="column">
                        <h3>Your Ranking ({selectedParticipants.length})</h3>
                        {selectedParticipants.length === 0 ? (
                            <p className="empty-state">Select people from the left to rank them</p>
                        ) : (
                            <div className="ranked-list">
                                {selectedParticipants.map((p, index) => (
                                    <div key={p.id} className="ranked-item">
                                        <div className="rank-number">#{index + 1}</div>
                                        <div className="participant-info">
                                            <span className="participant-name">{p.name}</span>
                                        </div>
                                        <div className="rank-controls">
                                            <button
                                                onClick={() => moveUp(index)}
                                                disabled={index === 0}
                                                className="btn-icon"
                                                title="Move up"
                                            >
                                                ↑
                                            </button>
                                            <button
                                                onClick={() => moveDown(index)}
                                                disabled={index === selectedParticipants.length - 1}
                                                className="btn-icon"
                                                title="Move down"
                                            >
                                                ↓
                                            </button>
                                            <button
                                                onClick={() => toggleSelection(p)}
                                                className="btn-icon remove"
                                                title="Remove"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="actions">
                    <button
                        onClick={handleSubmit}
                        className="btn btn-primary"
                        disabled={selectedParticipants.length === 0}
                    >
                        Submit Rankings ({selectedParticipants.length})
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ParticipantSelection;
