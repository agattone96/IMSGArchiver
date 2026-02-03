import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import http from 'http';
import { app, BrowserWindow } from 'electron';

let backendProcess: ChildProcess | null = null;
const BACKEND_PORT = 8000;

function log(message: string) {
    console.log(`[Python] ${message}`);
}

function findPython(): string {
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
                return pythonCmd;
            }
        } catch { }
    }

    try {
        const { execSync } = require('child_process');
        const pythonPath = execSync('which python3', { encoding: 'utf-8' }).trim();
        if (pythonPath) return pythonPath;
    } catch { }

    throw new Error('Python 3 not found');
}

export function startPythonServer(splashWindow?: BrowserWindow | null): Promise<number> {
    log('Starting Backend initialization');
    splashWindow?.webContents.send('splash-progress', { message: 'Locating Python Environment...', percent: 10 });

    return new Promise((resolve, reject) => {
        let pythonPath;
        try {
            pythonPath = findPython();
            log(`Found Python at: ${pythonPath}`);
            splashWindow?.webContents.send('splash-progress', { message: 'Python Environment Found', percent: 25 });
        } catch (error: any) {
            log(`ERROR: ${error.message}`);
            reject(error);
            return;
        }

        const isDev = !app.isPackaged;
        const projectRoot = isDev ? path.join(__dirname, '../../') : process.resourcesPath;
        const scriptPath = path.join(projectRoot, 'backend', 'src', 'app.py');

        if (!fs.existsSync(scriptPath)) {
            const error = `ERROR: app.py not found at ${scriptPath}`;
            log(error);
            reject(new Error(error));
            return;
        }

        splashWindow?.webContents.send('splash-progress', { message: 'Spawning Core Engine...', percent: 40 });

        log(`Spawning Backend: ${pythonPath} ${scriptPath}`);

        backendProcess = spawn(pythonPath, [scriptPath], {
            cwd: projectRoot,
            env: {
                ...process.env,
                PYTHONUNBUFFERED: '1',
                PYTHONPATH: projectRoot
            }
        });

        backendProcess.stdout?.on('data', (data) => log(`stdout: ${data}`));
        backendProcess.stderr?.on('data', (data) => log(`stderr: ${data}`));

        backendProcess.on('close', (code) => {
            log(`Backend exited with code ${code}`);
            backendProcess = null;
        });

        let attempts = 0;
        const checkInterval = setInterval(() => {
            attempts++;
            const progress = Math.min(40 + (attempts * 2), 90);
            splashWindow?.webContents.send('splash-progress', { message: 'Initializing Database...', percent: progress });

            const req = http.request({
                host: '127.0.0.1',
                port: BACKEND_PORT,
                path: '/system/status',
                method: 'GET'
            }, (res) => {
                if (res.statusCode === 200) {
                    clearInterval(checkInterval);
                    splashWindow?.webContents.send('splash-progress', { message: 'Ready!', percent: 100 });
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

export function killPythonServer() {
    if (backendProcess) {
        log('Killing backend process...');
        backendProcess.kill();
        backendProcess = null;
    }
}
