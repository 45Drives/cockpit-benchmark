import { benchmarkPath, benchmarkRuntime, benchmarkToolFio, benchmarkTypeIops, benchmarkTypeSpectrum, benchmarkTypeThroughput } from "./elements";
import { ProgressBar } from "./ProgressBar";

export async function runCommand(argv) {
    return new Promise((resolve, reject) => {
        let proc = cockpit.spawn(argv, {
            err: 'out',
            superuser: 'require',
        });

        proc.done((data) => {
            resolve(data);
        });
        
        proc.fail((err, data) => {
            reject(data);
        });
    })
}

export function bytesToLargest(x) {
    let unitLut = ['KB/s', 'MB/s', 'GB/s', 'TB/s'];
    
    let index = 1;

    let value = x;
    let style = unitLut[0];

    while (value > 1000) {
        let unit = unitLut[index];
        let size = value / 1000;

        index += 1;

        if (size >= 1) {
            style = unit;
            value = size;
        }
    }

    return [value, style];
}

export function splitNumberLetter(x, provideAvailable) {
    if (!x) return null;
    x = x.toString();
    let number = x.match(/\d*\.?\d*/g)?.join('');
    let string = x.replace(/\d*\.?\d*/g, '');
    if ((!number || !string) && !provideAvailable) return null;

    return [number, string];
}

export function alertClasses() {
    const alert = document.querySelector('#benchmark-alert');
    const alertIcon = document.querySelector('#benchmark-alert-icon');
    const alertText = document.querySelector('#benchmark-alert-text');

    return [alert, alertIcon, alertText];
}

export function clearAlert() {
    const [alert, alertIcon, alertText] = alertClasses();

    alert.className = 'no-margin';
    alertIcon.className = '';
    alertText.innerHTML = '';
}

export function showSuccessAlert(message) {
    const [alert, alertIcon, alertText] = alertClasses();

    clearAlert();

    alert.classList.add("alert", "alert-success");
    alertIcon.classList.add("pficon", "pficon-ok");
    alertText.innerHTML = message;

    setTimeout(() => clearAlert(), 3200);
}

export function showErrorAlert(message) {
    const [alert, alertIcon, alertText] = alertClasses();

    clearAlert();

    alert.classList.add("alert", "alert-danger");
    alertIcon.classList.add("pficon", "pficon-error-circle-o");
    alertText.innerHTML = message;

    setTimeout(() => clearAlert(), 3200);
}

export function transparentize(hex) {
    const colorLib = window['@kurkle/color'];
    return colorLib(hex).alpha(0.5).hexString();
}

export async function deleteFiles(files = []) {
    try {
        await cockpit.spawn(['rm', '-f', ...files], { err: 'out', superuser: 'require' });
    } catch (error) {
        console.log(error);
    }
}

export async function isValidDirectory(path) {
    try {
        const res = await cockpit.spawn(['/usr/share/cockpit/benchmark/scripts/exists.py', path], { err: 'out', superuser: 'require' });

        const result = res.trim();

        return result === 'y';
    } catch (error) {
        console.log(error);
        return false;
    }
}

export async function launchBenchmark(downloadManager, displayManager, fioManager) {
    downloadManager.reset();

    let threadCount = 1;

    let toolName = null;
    
    if (benchmarkToolFio.checked) toolName = 'fio';

    if (!toolName) {
        showErrorAlert('You did not provide a tool to use.');
        return;
    }

    let recordSize = null;
    
    if (benchmarkTypeThroughput.checked) recordSize = '1M';
    if (benchmarkTypeIops.checked) recordSize = '4k';
    if (benchmarkTypeSpectrum.checked) recordSize = '4k-1M';

    if (!recordSize) {
        showErrorAlert('You did not provide a benchmark type.');
        return;
    }
    
    let fileSize = splitNumberLetter(benchmarkSize.value);

    if (!fileSize) {
        showErrorAlert('You did not provide a valid file size. (Ex. 1G)');
        return;
    }

    if (!['k', 'm', 'g'].includes(fileSize[1].toLowerCase())) {
        showErrorAlert('You did not provide a valid file size unit. (k|M|G)');
        return;
    }

    let ioDepth = [...document.querySelectorAll('#benchmark-iodepth > option')].find(x => x.selected).value;

    let runtime = benchmarkRuntime.value;

    let testPath = benchmarkPath.value;

    if (!testPath) {
        showErrorAlert('You did not provide a test path.');
        return;
    }

    let validPath = await isValidDirectory(testPath);

    if (!validPath) {
        showErrorAlert('You did not provide a valid test path.');
        return;
    }

    ProgressBar.start();

    displayManager.hide();

    ProgressBar.show();

    if (toolName === 'fio' && !benchmarkTypeSpectrum.checked) {
        fioManager.generic({
            threadCount,
            recordSize,
            fileSize,
            testPath,
            ioDepth,
            runtime,
        });
    }

    if (toolName === 'fio' && benchmarkTypeSpectrum.checked) {
        fioManager.spectrum({
            threadCount,
            recordSizes: ['4k', '8k', '16k', '32k', '64k', '128k', '512k', '1M'],
            fileSize,
            testPath,
            ioDepth,
            runtime,
        });
    }
}