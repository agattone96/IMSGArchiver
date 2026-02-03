import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { app } from 'electron';
import { log } from './index';

let pythonProcess: ChildProcess | null = null;

export function startPythonServer() {
    // In packaged app, python binary is in Resources/backend/venv/bin/python generally?
    // But referencing logic from logs: `python3 .../backend/src/app.py`

    // We assume backend/src/app.py exists relative to app path
    const scriptPath = path.join(process.resourcesPath, 'backend', 'src', 'app.py');
    const pythonCmd = 'python3'; // Simplification for now

    // Check if packaged
    let pythonScript = path.join(app.getAppPath(), 'backend', 'src', 'app.py');
    if (app.isPackaged) {
        pythonScript = path.join(process.resourcesPath, 'backend', 'src', 'app.py');
    }

    log(`Starting Python server: ${pythonScript}`);

    pythonProcess = spawn(pythonCmd, [pythonScript], {
        cwd: path.dirname(pythonScript),
        env: { ...process.env, PYTHONUNBUFFERED: '1' }
    });

    pythonProcess.stdout?.on('data', (data) => {
        log(`[Python] ${data.toString().trim()}`);
    });

    pythonProcess.stderr?.on('data', (data) => {
        log(`[Python Error] ${data.toString().trim()}`, 'ERROR');
    });

    pythonProcess.on('close', (code) => {
        log(`Python process exited with code ${code}`);
    });
}

export function killPythonServer() {
    if (pythonProcess) {
        log('Killing Python server...');
        pythonProcess.kill();
        pythonProcess = null;
    }
}
