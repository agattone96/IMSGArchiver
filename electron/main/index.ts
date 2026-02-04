import { app, BrowserWindow, Menu, shell, dialog, ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';
import { startPythonServer, killPythonServer } from './python';
import { setupIPC } from './ipc';

let mainWindow: BrowserWindow | null = null;
let splashWindow: BrowserWindow | null = null;
const FRONTEND_PORT = 5173;
const openRequestQueue: Array<{ argv: string[]; cwd: string; timestamp: number }> = [];
let rendererReady = false;
let movePromptShown = false;
let initStatePath: string | null = null;

app.setName('Archiver');

function sendToRenderer(channel: string, payload: any) {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send(channel, payload);
    }
}

function getInitStatePath() {
    if (!initStatePath) {
        initStatePath = path.join(app.getPath('userData'), 'init-state.json');
    }
    return initStatePath;
}

function readInitState() {
    try {
        const raw = fs.readFileSync(getInitStatePath(), 'utf-8');
        return JSON.parse(raw);
    } catch {
        return {};
    }
}

function writeInitState(state: Record<string, any>) {
    try {
        fs.mkdirSync(app.getPath('userData'), { recursive: true });
        fs.writeFileSync(getInitStatePath(), JSON.stringify(state, null, 2), 'utf-8');
    } catch (e) {
        log(`Failed to write init state: ${e}`, 'ERROR');
    }
}

function isFirstRun() {
    const state = readInitState();
    return !state?.hasInitialized;
}

function sendSplashUpdate(payload: { stage?: string; status?: string; error?: string; detail?: string }) {
    if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.webContents.send('splash-progress', payload);
    }
}

async function waitForBackendReady(timeoutMs = 15000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 2000);
            const res = await fetch('http://127.0.0.1:8000/health', { signal: controller.signal });
            clearTimeout(timer);
            if (res.ok) return true;
        } catch {
            // ignore and retry
        }
        await new Promise((r) => setTimeout(r, 500));
    }
    return false;
}

async function runInitialization() {
    try {
        sendSplashUpdate({ stage: 'Preparing folders', status: 'progress' });
        fs.mkdirSync(app.getPath('userData'), { recursive: true });
        fs.mkdirSync(LOG_DIR, { recursive: true });

        sendSplashUpdate({ stage: 'Starting backend', status: 'progress' });
        startPythonServer();

        sendSplashUpdate({ stage: 'Checking readiness', status: 'progress' });
        const ready = await waitForBackendReady();
        if (!ready) {
            throw new Error('Backend did not become ready in time.');
        }

        sendSplashUpdate({ stage: 'Finalizing', status: 'progress' });
        writeInitState({ hasInitialized: true, ts: new Date().toISOString() });
        return true;
    } catch (err: any) {
        const message = err?.message || String(err);
        sendSplashUpdate({ status: 'error', error: 'Initialization failed', detail: message });
        return false;
    }
}

function getBundlePath() {
    const exePath = app.getPath('exe');
    const contentsIndex = exePath.indexOf('/Contents/');
    if (contentsIndex !== -1) {
        return exePath.slice(0, contentsIndex);
    }
    return exePath;
}

function shouldPromptMoveToApplications() {
    if (process.platform !== 'darwin') return false;
    if (!app.isPackaged) return false;
    if (movePromptShown) return false;
    const bundlePath = getBundlePath().toLowerCase();
    if (bundlePath.includes('/applications/')) return false;
    return (
        bundlePath.includes('/downloads/') ||
        bundlePath.includes('/desktop/') ||
        bundlePath.includes('/volumes/')
    );
}

function createMoveToApplicationsWindow() {
    const iconPath = getRuntimeIconPath();
    const win = new BrowserWindow({
        width: 520,
        height: 300,
        resizable: false,
        minimizable: false,
        maximizable: false,
        fullscreenable: false,
        closable: false,
        alwaysOnTop: true,
        show: false,
        modal: true,
        title: 'Move to Applications',
        icon: iconPath,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    win.setMenuBarVisibility(false);
    win.loadFile(
        app.isPackaged
            ? path.join(process.resourcesPath, 'electron/move-to-applications.html')
            : path.join(__dirname, '../move-to-applications.html')
    );

    win.on('close', (event) => {
        event.preventDefault();
    });

    win.once('ready-to-show', () => {
        win.show();
        win.focus();
    });

    return win;
}

function promptMoveToApplications() {
    if (!shouldPromptMoveToApplications()) return false;
    movePromptShown = true;
    const win = createMoveToApplicationsWindow();
    let moveInProgress = false;

    const showMoveFailed = () => {
        if (win.isDestroyed()) return;
        if (win.webContents.isLoading()) {
            win.webContents.once('did-finish-load', () => {
                if (!win.isDestroyed()) win.webContents.send('move-to-applications-failed');
            });
            return;
        }
        win.webContents.send('move-to-applications-failed');
    };

    ipcMain.removeAllListeners('move-to-applications-choice');
    ipcMain.on('move-to-applications-choice', async (_event: any, choice: 'move' | 'quit') => {
        if (choice === 'quit') {
            app.exit(0);
            return;
        }
        if (choice === 'move') {
            if (moveInProgress) return;
            moveInProgress = true;
            try {
                const moved = app.moveToApplicationsFolder({
                    conflictHandler: (conflictType) => {
                        if (conflictType === 'exists') return true;
                        return true;
                    }
                });
                if (moved) {
                    app.relaunch();
                    app.exit(0);
                    return;
                }
            } catch (e) {
                log(`Move to Applications failed: ${e}`, 'ERROR');
            } finally {
                moveInProgress = false;
            }
            showMoveFailed();
        }
    });

    return true;
}

async function handleMoveToApplicationsFlow() {
    const blocked = promptMoveToApplications();
    if (blocked) return false;
    return true;
}

function parseSecondInstancePayload(argv: string[], cwd: string) {
    return {
        argv: Array.isArray(argv) ? argv : [],
        cwd: cwd || process.cwd(),
        timestamp: Date.now()
    };
}

function flushOpenRequests() {
    if (!rendererReady || !mainWindow || mainWindow.isDestroyed()) return;
    while (openRequestQueue.length > 0) {
        const payload = openRequestQueue.shift();
        if (payload) {
            sendToRenderer('app:open-request', payload);
        }
    }
}

function enqueueOpenRequest(payload: { argv: string[]; cwd: string; timestamp: number }) {
    openRequestQueue.push(payload);
    flushOpenRequests();
}

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
app.on('second-instance', (_event, argv, workingDirectory) => {
        const hasMainWindow = mainWindow && !mainWindow.isDestroyed();
        const hasSplash = splashWindow && !splashWindow.isDestroyed();

        if (hasSplash && !hasMainWindow) {
            if (splashWindow!.isMinimized()) splashWindow!.restore();
            splashWindow!.show();
            splashWindow!.focus();
            return;
        }

        if (hasMainWindow) {
            if (mainWindow!.isMinimized()) mainWindow!.restore();
            mainWindow!.focus();
            return;
        }

        if (!hasSplash) {
            app.whenReady().then(() => createWindow());
        }
        const payload = parseSecondInstancePayload(argv, workingDirectory);
        enqueueOpenRequest(payload);
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
        flushOpenRequests();
    });

    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        log(`Failed to load: ${errorDescription} (${errorCode})`, 'ERROR');
    });
}

app.whenReady().then(async () => {
    log('App ready');
    if (process.platform === 'darwin') {
        const continueLaunch = await handleMoveToApplicationsFlow();
        if (!continueLaunch) return;
    }
    setupIPC();
    const firstRun = isFirstRun();
    if (firstRun) {
        createSplashWindow();
        const ok = await runInitialization();
        if (!ok) return;
    } else {
        try {
            startPythonServer();
        } catch (e) {
            log(`Failed to start backend: ${e}`, 'ERROR');
        }
    }
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

ipcMain.on('renderer-ready', () => {
    rendererReady = true;
    flushOpenRequests();
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

ipcMain.on('splash-quit', () => {
    app.quit();
});
