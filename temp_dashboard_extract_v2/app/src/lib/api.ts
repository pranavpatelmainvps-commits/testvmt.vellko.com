export const API_BASE = '';

export async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
    // Add Auth Header
    const token = localStorage.getItem('token');
    const headers = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options?.headers,
    };

    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        if (response.status === 401) {
            // Force user logout on token expiration 
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.reload(); // Instantly reset React state to Login screen
        }
        if (response.status === 429) {
            throw new Error('Too many requests. Please wait a moment and try again.');
        }

        const error = await response.json().catch(() => ({ error: `HTTP ${response.status} Error: Unexpected Response Format` }));
        throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
}
