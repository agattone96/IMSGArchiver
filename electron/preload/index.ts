import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
    send: (channel: string, data: any) => {
        // Whitelist channels
        let validChannels = ['toMain', 'complete-cleanup', 'renderer-ready', 'splash-quit'];
        if (validChannels.includes(channel)) {
            ipcRenderer.send(channel, data);
        }
    },
    on: (channel: string, func: (...args: any[]) => void) => {
        let validChannels = ['fromMain', 'splash-progress', 'cleanup-complete', 'app-open', 'app:open-request'];
        if (validChannels.includes(channel)) {
            // Deliberately strip event as it includes `sender` 
            ipcRenderer.on(channel, (event, ...args) => func(...args));
        }
    },
    invoke: async (channel: string, ...args: any[]) => {
        let validChannels = ['complete-cleanup', 'open-full-disk-access'];
        if (validChannels.includes(channel)) {
            return await ipcRenderer.invoke(channel, ...args);
        }
    }
});
