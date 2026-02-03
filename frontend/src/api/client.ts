export const api = {
    getOnboardingStatus: async () => {
        try {
            const response = await fetch('http://127.0.0.1:8000/onboarding/status');
            if (!response.ok) throw new Error('API Error');
            return await response.json();
        } catch (e) {
            console.error(e);
            throw e;
        }
    }
};
