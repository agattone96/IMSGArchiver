import { ipcMain } from 'electron';

/**
 * Setup IPC handlers for communication between renderer (React) and main process.
 * These handlers can proxy requests to the Python backend API.
 */
export function setupIPC() {
    // Example: Proxy a request to the Python backend
    ipcMain.handle('get-messages', async (event, chatGuid: string) => {
        try {
            // In a real implementation, you'd make an HTTP request to the Python backend
            // For now, this is a placeholder that shows the pattern
            const response = await fetch(`http://127.0.0.1:8000/chats/${chatGuid}/messages`);
            return await response.json();
        } catch (error: any) {
            console.error('IPC Error:', error);
            throw error;
        }
    });

    ipcMain.handle('get-chats', async (event, search?: string) => {
        try {
            const url = search
                ? `http://127.0.0.1:8000/chats/recent?search=${encodeURIComponent(search)}`
                : 'http://127.0.0.1:8000/chats/recent';
            const response = await fetch(url);
            return await response.json();
        } catch (error: any) {
            console.error('IPC Error:', error);
            throw error;
        }
    });

    ipcMain.handle('archive-chat', async (event, chatGuid: string, format: string) => {
        try {
            const response = await fetch(`http://127.0.0.1:8000/chats/${chatGuid}/archive`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_guid: chatGuid, format, incremental: true })
            });
            return await response.json();
        } catch (error: any) {
            console.error('IPC Error:', error);
            throw error;
        }
    });

    console.log('[IPC] Handlers registered');
}
