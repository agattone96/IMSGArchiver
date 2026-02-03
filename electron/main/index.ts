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

export function log(message: string, level = 'INFO') {
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

function getRuntimeIconPath() {
    if (process.platform === 'darwin') {
        if (app.isPackaged) {
            return path.join(process.resourcesPath, 'assets', 'icons', 'app-icon.icns');
        }
        return path.join(__dirname, '../../assets/icons/app-icon.png');
    }
    return '';
}

function createSplashWindow() {
    const iconPath = getRuntimeIconPath();
    splashWindow = new BrowserWindow({
        width: 300,
        height: 350,
        backgroundColor: '#05060b',
        frame: false,
        resizable: false,
        alwaysOnTop: true,
        show: false,
        title: 'Archiver',
        icon: iconPath,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    splashWindow.loadFile(
        app.isPackaged
            ? path.join(process.resourcesPath, 'electron/splash.html')
            : path.join(__dirname, '../splash.html')
    );

    splashWindow.once('ready-to-show', () => {
        if (splashWindow) {
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
        : `file://${path.join(app.getAppPath(), 'frontend/dist/index.html')}`;

    log(`Loading URL: ${loadUrl}`);

    mainWindow.loadURL(loadUrl);

    mainWindow.once('ready-to-show', () => {
        if (splashWindow) {
            splashWindow.close();
        }
        if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
        }
    });

    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        log(`Failed to load: ${errorDescription} (${errorCode})`, 'ERROR');
    });
}

app.whenReady().then(async () => {
    log('App ready');
    setupIPC();
    createSplashWindow();

    // Start backend
    try {
        startPythonServer();
    } catch (e) {
        log(`Failed to start backend: ${e}`, 'ERROR');
    }

    // Wait for splash or directly create window if dev (actually we simulate splash)
    setTimeout(() => {
        createWindow();
    }, 2000);

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('before-quit', () => {
    log('App quitting...');
    killPythonServer();
});
