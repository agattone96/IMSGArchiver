import { app, BrowserWindow, Menu, shell, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import { startPythonServer, killPythonServer } from './python';
import { setupIPC } from './ipc';

let mainWindow: BrowserWindow | null = null;
let splashWindow: BrowserWindow | null = null;
const FRONTEND_PORT = 5173;

app.setName('Archiver');

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });
}

const LOG_DIR = path.join(app.getPath('home'), 'Library', 'Logs', 'Archiver');
const LOG_FILE = path.join(LOG_DIR, `launch_${new Date().toISOString().replace(/[:.]/g, '-')}.log`);

if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
}

function log(message: string, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}\n`;
    fs.appendFileSync(LOG_FILE, logMessage);
    console.log(logMessage.trim());
}

log('='.repeat(60));
log('iMessage Archiver Launch Diagnostics');
log(`App Version: ${app.getVersion()}`);
log(`Electron Version: ${process.versions.electron}`);
log(`Node Version: ${process.versions.node}`);
log(`Platform: ${process.platform} ${process.arch}`);
log(`Packaged: ${app.isPackaged}`);
log(`Log file: ${LOG_FILE}`);
log('='.repeat(60));

// Global error handlers
process.on('uncaughtException', (error) => {
    log(`UNCAUGHT EXCEPTION: ${error.message}`, 'ERROR');
    log(error.stack || '', 'ERROR');
});

function getRuntimeIconPath(): string {
    const isDev = !app.isPackaged;
    const base = isDev
        ? path.join(__dirname, '../../assets/icons')
        : path.join(process.resourcesPath, 'assets/icons');

    const iconPath = path.join(base, 'app-icon.icns');
    log(`Icon path: ${iconPath} (exists: ${fs.existsSync(iconPath)})`);
    return iconPath;
}

function getSplashPath(): string {
    const isDev = !app.isPackaged;
    const splashPath = isDev
        ? path.join(__dirname, '../../electron/splash.html')
        : path.join(process.resourcesPath, 'electron/splash.html');

    log(`Splash path: ${splashPath} (exists: ${fs.existsSync(splashPath)})`);
    return splashPath;
}

function createSplashScreen() {
    log('Creating splash screen');
    const runtimeIcon = getRuntimeIconPath();
    const splashPath = getSplashPath();

    if (!fs.existsSync(splashPath)) {
        log(`ERROR: Splash file not found at ${splashPath}`, 'ERROR');
        dialog.showErrorBox('Resource Missing', `Splash screen not found at:\n${splashPath}`);
        app.quit();
        return;
    }

    splashWindow = new BrowserWindow({
        width: 500,
        height: 350,
        transparent: true,
        frame: false,
        alwaysOnTop: true,
        resizable: false,
        backgroundColor: '#05060b',
        icon: runtimeIcon,
        show: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    splashWindow.loadFile(splashPath);

    splashWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        log(`Splash failed to load: ${errorCode} - ${errorDescription}`, 'ERROR');
        dialog.showErrorBox('Splash Load Failed', `Error: ${errorDescription}`);
    });

    splashWindow.once('ready-to-show', () => {
        log('Splash ready to show');
        if (splashWindow && !splashWindow.isDestroyed()) {
            splashWindow.show();
        }
    });

    splashWindow.on('closed', () => {
        splashWindow = null;
    });
}

function createWindow() {
    log('Creating main window');
    const runtimeIcon = getRuntimeIconPath();
    const isDev = !app.isPackaged;

    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        backgroundColor: '#05060b',
        icon: runtimeIcon,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, '../preload/index.js')
        },
        title: 'Archiver',
        show: false
    });

    const loadUrl = isDev
        ? `http://localhost:${FRONTEND_PORT}`
        : `file://${path.join(__dirname, '../../frontend/dist/index.html')}`;

    log(`Loading main window URL: ${loadUrl}`);

    // In production, verify the file exists
    if (!isDev) {
        const indexPath = path.join(__dirname, '../../frontend/dist/index.html');
        if (!fs.existsSync(indexPath)) {
            log(`ERROR: index.html not found at ${indexPath}`, 'ERROR');
            dialog.showErrorBox('Resource Missing', `Frontend index.html not found at:\n${indexPath}`);
            app.quit();
            return;
        }
    }

    mainWindow.loadURL(loadUrl);

    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        log(`Main window failed to load: ${errorCode} - ${errorDescription}`, 'ERROR');
        dialog.showErrorBox('Failed to Load', `The application failed to load:\n${errorDescription}\n\nCheck logs at:\n${LOG_FILE}`);
    });

    mainWindow.webContents.on('render-process-gone', (event, details) => {
        log(`Render process gone: ${details.reason}`, 'ERROR');
        dialog.showErrorBox('Render Process Crashed', `Reason: ${details.reason}\nExit code: ${details.exitCode}`);
    });

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });

    mainWindow.once('ready-to-show', () => {
        log('Main window ready-to-show');
        if (splashWindow && !splashWindow.isDestroyed()) {
            splashWindow.close();
        }
        mainWindow?.show();
        log('App fully initialized');
    });

    if (isDev) {
        mainWindow.webContents.openDevTools();
    }

    mainWindow.on('closed', () => {
        log('Main window closed');
        mainWindow = null;
    });
}

app.whenReady().then(async () => {
    log('Electron app ready, starting initialization');

    // macOS Menu
    if (process.platform === 'darwin') {
        const template: Electron.MenuItemConstructorOptions[] = [
            {
                label: 'Archiver',
                submenu: [
                    { role: 'about' },
                    { type: 'separator' },
                    { role: 'services' },
                    { type: 'separator' },
                    { role: 'hide' },
                    { role: 'hideOthers' },
                    { role: 'unhide' },
                    { type: 'separator' },
                    { role: 'quit' }
                ]
            },
            { role: 'editMenu' },
            { role: 'viewMenu' },
            { role: 'windowMenu' }
        ];
        const menu = Menu.buildFromTemplate(template);
        Menu.setApplicationMenu(menu);

        // Set Dock Icon
        const iconPath = getRuntimeIconPath();
        if (fs.existsSync(iconPath)) {
            app.dock.setIcon(iconPath);
            log('Dock icon set successfully');
        } else {
            log(`Dock icon NOT found at ${iconPath}`, 'WARNING');
        }
    }

    try {
        // Setup IPC handlers
        setupIPC();

        // Show splash immediately
        createSplashScreen();

        // Start Backend in background
        await startPythonServer(splashWindow);

        // Create main window
        createWindow();
    } catch (error: any) {
        log(`FATAL ERROR: ${error.message}`, 'ERROR');
        log(error.stack || '', 'ERROR');
        dialog.showErrorBox('Fatal Error', `The application failed to start:\n${error.message}\n\nCheck logs at:\n${LOG_FILE}`);
        if (splashWindow && !splashWindow.isDestroyed()) {
            splashWindow.close();
        }
        app.quit();
    }
});

app.on('window-all-closed', () => {
    killPythonServer();
    app.quit();
});

app.on('before-quit', () => {
    log('App quitting, cleaning up...');
    killPythonServer();
});
