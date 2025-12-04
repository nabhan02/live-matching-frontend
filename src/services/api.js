const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export const adminAPI = {
    login: async (password) => {
        const response = await fetch(`${API_BASE_URL}/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });
        return response.json();
    },

    uploadCSV: async (file) => {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${API_BASE_URL}/admin/upload-csv`, {
            method: 'POST',
            body: formData
        });
        return response.json();
    },

    getParticipants: async () => {
        const response = await fetch(`${API_BASE_URL}/admin/participants`);
        return response.json();
    },

    runMatching: async () => {
        const response = await fetch(`${API_BASE_URL}/admin/run-matching`, {
            method: 'POST'
        });
        return response.json();
    },

    getMatches: async () => {
        const response = await fetch(`${API_BASE_URL}/admin/matches`);
        return response.json();
    },

    clearAll: async () => {
        const response = await fetch(`${API_BASE_URL}/admin/clear-all`, {
            method: 'POST'
        });
        return response.json();
    }
};

export const participantAPI = {
    getParticipantData: async (token) => {
        const response = await fetch(`${API_BASE_URL}/participant/${token}`);
        return response.json();
    },

    submitSelections: async (token, selections) => {
        const response = await fetch(`${API_BASE_URL}/participant/${token}/selections`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ selections })
        });
        return response.json();
    }
};
