import { app, BrowserWindow, Menu, shell, ipcMain } from 'electron';
import { spawn, ChildProcess } from 'child_process';
import http from 'http';
import path from 'path';
import net from 'net';
import fs from 'fs';

let mainWindow: BrowserWindow | null = null;
let splashWindow: BrowserWindow | null = null;
let backendProcess: ChildProcess | null = null;
const BACKEND_PORT = 8000;
const FRONTEND_PORT = 5173;

app.setName('Archiver');

if (process.platform === 'win32') {
    app.setAppUserModelId('com.antigravity.imessagearchiver');
}

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

function getRuntimeIconPath(): string | undefined {
    const base = app.isPackaged
        ? process.resourcesPath
        : path.join(__dirname, '../../assets/icons'); // Adjusted path for dev

    if (process.platform === 'win32') return path.join(base, 'icon.ico');
    if (process.platform === 'linux') return path.join(base, '512x512.png');
    if (process.platform === 'darwin') return path.join(base, 'app-icon.icns');
    return undefined;
}

function createSplashScreen() {
    log('Creating splash screen');
    const runtimeIcon = getRuntimeIconPath();
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

    splashWindow.loadFile(path.join(__dirname, '../splash.html'));
    splashWindow.once('ready-to-show', () => {
        if (splashWindow && !splashWindow.isDestroyed()) {
            splashWindow.show();
        }
    });
    splashWindow.on('closed', () => {
        splashWindow = null;
    });
}

function findPython(): string {
    // Common paths
    const pythonPaths = [
        path.join(app.getPath('home'), 'Library/Application Support/Archiver/.venv/bin/python3'),
        'python3',
        '/usr/bin/python3',
        '/usr/local/bin/python3',
        '/opt/homebrew/bin/python3',
        'python'
    ];

    for (const pythonCmd of pythonPaths) {
        try {
            const { execSync } = require('child_process');
            const version = execSync(`${pythonCmd} --version 2>&1`, { encoding: 'utf-8' });
            if (version.includes('Python 3')) {
                log(`Found Python: ${pythonCmd} (${version.trim()})`);
                return pythonCmd;
            }
        } catch {
            // Continue
        }
    }

    try {
        const { execSync } = require('child_process');
        const pythonPath = execSync('which python3', { encoding: 'utf-8' }).trim();
        if (pythonPath) return pythonPath;
    } catch { }

    throw new Error('Python 3 not found');
}

function startBackend(): Promise<number> {
    log('Starting Backend initialization');
    if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.webContents.send('splash-progress', { message: 'Locating Python Environment...', percent: 10 });
    }

    return new Promise((resolve, reject) => {
        let pythonPath;
        try {
            pythonPath = findPython();
            if (splashWindow && !splashWindow.isDestroyed()) {
                splashWindow.webContents.send('splash-progress', { message: 'Python Environment Found', percent: 25 });
            }
        } catch (error: any) {
            log(`ERROR: ${error.message}`, 'ERROR');
            reject(error);
            return;
        }

        const isDev = !app.isPackaged;
        // In dev: project_root/backend/src/app.py
        // In prod: resources/backend/src/app.py
        const projectRoot = isDev ? path.join(__dirname, '../../') : process.resourcesPath;
        const scriptPath = path.join(projectRoot, 'backend', 'src', 'app.py');

        if (!fs.existsSync(scriptPath)) {
            // Try fallback for flattened structure if needed, or error
            const error = `ERROR: app.py not found at ${scriptPath}`;
            log(error, 'ERROR');
            reject(new Error(error));
            return;
        }

        if (splashWindow && !splashWindow.isDestroyed()) {
            splashWindow.webContents.send('splash-progress', { message: 'Spawning Core Engine...', percent: 40 });
        }

        log(`Spawning Backend: ${pythonPath} ${scriptPath}`);

        backendProcess = spawn(pythonPath, [scriptPath], {
            cwd: projectRoot,
            env: {
                ...process.env,
                PYTHONUNBUFFERED: '1',
                PYTHONPATH: projectRoot
            }
        });

        backendProcess.stdout?.on('data', (data) => log(`Backend: ${data}`));
        backendProcess.stderr?.on('data', (data) => log(`Backend Error: ${data}`));
        backendProcess.on('close', (code) => log(`Backend exited with code ${code}`));

        let attempts = 0;
        const checkInterval = setInterval(() => {
            attempts++;
            if (splashWindow && !splashWindow.isDestroyed()) {
                const progress = Math.min(40 + (attempts * 2), 90);
                splashWindow.webContents.send('splash-progress', { message: 'Initializing Database...', percent: progress });
            }

            const req = http.request({
                host: '127.0.0.1',
                port: BACKEND_PORT,
                path: '/system/status',
                method: 'GET'
            }, (res) => {
                if (res.statusCode === 200) {
                    clearInterval(checkInterval);
                    if (splashWindow && !splashWindow.isDestroyed()) {
                        splashWindow.webContents.send('splash-progress', { message: 'Ready!', percent: 100 });
                    }
                    resolve(BACKEND_PORT);
                }
            });
            req.on('error', () => { });
            req.end();
        }, 500);

        setTimeout(() => {
            clearInterval(checkInterval);
            reject(new Error('Backend initialization timed out'));
        }, 30000);
    });
}

function createWindow() {
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
            preload: path.join(__dirname, '../preload/index.js') // Adjusted path for build structure
        },
        title: 'Archiver',
        show: false
    });

    const loadUrl = isDev
        ? `http://localhost:${FRONTEND_PORT}`
        : `file://${path.join(__dirname, '../../frontend/dist/index.html')}`;

    mainWindow.loadURL(loadUrl);

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });

    mainWindow.once('ready-to-show', () => {
        if (splashWindow && !splashWindow.isDestroyed()) {
            splashWindow.close();
        }
        mainWindow?.show();
    });
}

app.whenReady().then(async () => {
    if (process.platform === 'darwin') {
        // Menu template...
        // simplified for brevity in this step, can add back
    }

    try {
        createSplashScreen();
        await startBackend();
        createWindow();
    } catch (error: any) {
        log(`FATAL: ${error.message}`);
        app.quit();
    }
});

app.on('window-all-closed', () => {
    if (backendProcess) backendProcess.kill();
    app.quit();
});
