/*
    Cockpit Benchmarks - A Storage Benchmark Utility for Cockpit.
    Copyright (C) 2021 Dawson Della Valle <ddellavalle@45drives.com>

    This file is part of Cockpit Benchmarks.

    Cockpit Benchmarks is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    Cockpit Benchmarks is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with Cockpit Benchmarks.  If not, see <https://www.gnu.org/licenses/>.
*/

const benchmarkToolFio = document.querySelector('#benchmark-tool-fio');
const benchmarkToolIozone = document.querySelector('#benchmark-tool-iozone');
const benchmarkTypeThroughput = document.querySelector('#benchmark-type-throughput');
const benchmarkTypeIops = document.querySelector('#benchmark-type-iops');
const benchmarkTypeSpectrum = document.querySelector('#benchmark-type-spectrum');
const benchmarkSize = document.querySelector('#benchmark-size');
const benchmarkPath = document.querySelector('#benchmark-path');
const benchmarkProgress = document.querySelector('#benchmark-progress');
const benchmarkProcessingSpinner = document.querySelector('#benchmark-processing-spinner');

const benchmarkForm = document.querySelector('#benchmark-form');
const launchBenchmarkBtn = document.querySelector('#launch-benchmark');
const downloadBenchmarkBtn = document.querySelector('#download-benchmark');

const benchmarkOutput = document.querySelector('#benchmark-output');

const benchmarkChartSwitcher = document.querySelector('#benchmark-chart-switcher');
const chartTypeIops = document.querySelector('#chart-type-iops');
const chartTypeBandwidth = document.querySelector('#chart-type-bandwidth');

let benchmarkChart = null;
let benchmarkChartData = null;
let benchmarkData = null;

chartTypeIops.addEventListener('input', event => {
    if (event.target.checked) {
        displayBenchmarkOutputChartMany(benchmarkChartData, benchmarkChart.data.labels, 'iops');
    }
});

chartTypeBandwidth.addEventListener('input', event => {
    if (event.target.checked) {
        displayBenchmarkOutputChartMany(benchmarkChartData, benchmarkChart.data.labels, 'bandwidth');
    }
});

benchmarkToolFio.addEventListener('input', () => {
    benchmarkTypeSpectrum.removeAttribute('disabled');
    benchmarkTypeIops.removeAttribute('disabled');
});

benchmarkToolIozone.addEventListener('change', event => {
    if (event.target.checked) {
        benchmarkTypeSpectrum.checked = false;
        benchmarkTypeSpectrum.disabled = true;
        benchmarkTypeIops.checked = false;
        benchmarkTypeIops.disabled = true;
    }
});

benchmarkForm.addEventListener('submit', e => e.preventDefault());

launchBenchmarkBtn.addEventListener('click', async () => {
    resetDownload();

    let threadCount = 1;

    let toolName = null;
    
    if (benchmarkToolFio.checked) toolName = 'fio';
    if (benchmarkToolIozone.checked) toolName = 'iozone';

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

    let runtime = document.querySelector('#benchmark-runtime').value;

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

    benchmarkProcessingSpinner.classList.remove('hidden');

    if (benchmarkChart) {
        benchmarkOutput.classList.add('hidden');
        benchmarkChartSwitcher.classList.add('hidden');
    }

    showProgressBar();

    if (toolName === 'iozone') {
        iozoneBenchmark(threadCount, recordSize, fileSize);
    }

    if (toolName === 'fio' && !benchmarkTypeSpectrum.checked) {
        genericFIOBenchmark({
            threadCount,
            recordSize,
            fileSize,
            testPath,
            ioDepth,
            runtime,
        });
    }

    if (toolName === 'fio' && benchmarkTypeSpectrum.checked) {
        spectrumFIOBenchmark({
            threadCount,
            recordSizes: ['4k', '8k', '16k', '32k', '64k', '128k', '512k', '1M'],
            fileSize,
            testPath,
            ioDepth,
            runtime,
        });
    }
});

async function iozoneBenchmark(threadCount, recordSize, fileSize) {
    let iozoneOutputs = [];
    let escapedError = false;

    let idx = 0;

    while (idx < 3) {
        try {
            let args = ['iozone', '-t', threadCount, '-r', recordSize, '-s', fileSize.join(''), '-+n', '-i', idx, idx < 2 ? '-w' : null].filter(x => x !== null);
    
            let data = await cockpit.spawn(args, { err: 'out', superuser: 'require' });
            
            iozoneOutputs[idx] = parseIozoneOutput(data, threadCount);
        } catch (error) {
            console.log(error);
            escapedError = true;
            break;
        }

        idx += 1;
    }
    
    benchmarkProcessingSpinner.classList.add('hidden');

    if (escapedError) {
        showErrorAlert('The benchmark ended with a failed state.');
        return;
    }
    
    let output = {
        bytes: {
            writes: null,
            reads: null,
            randomReads: null,
            randomWrites: null,
        },
        largest: {
            writes: null,
            reads: null,
            randomReads: null,
            randomWrites: null,
        },
    };

    output.bytes['writes'] = [iozoneOutputs[0]['initial writers'].child, 'kB/s'];
    output.bytes['reads'] = [iozoneOutputs[1]['readers'].child, 'kB/s'];
    output.bytes['randomReads'] = [iozoneOutputs[2]['random readers'].child, 'kB/s'];
    output.bytes['randomWrites'] = [iozoneOutputs[2]['random writers'].child, 'kB/s'];

    output.largest['writes'] = bytesToLargest(Number(output.bytes['writes'][0])).map((v, i) => i === 0 ? v.toFixed(2) : v);
    output.largest['reads'] = bytesToLargest(Number(output.bytes['reads'][0])).map((v, i) => i === 0 ? v.toFixed(2) : v);
    output.largest['randomReads'] = bytesToLargest(Number(output.bytes['randomReads'][0])).map((v, i) => i === 0 ? v.toFixed(2) : v);
    output.largest['randomWrites'] = bytesToLargest(Number(output.bytes['randomWrites'][0])).map((v, i) => i === 0 ? v.toFixed(2) : v);

    showSuccessAlert('The benchmark has been completed.');

    benchmarkOutput.classList.remove('hidden');

    displayBenchmarkOutputChart(output, recordSize);

    enableDownload({
        data: [
            {
                recordSize,
                date: new Date(),
                bwUnit: recordSize === '1M' ? output.largest['writes'][1] : null,
                bandwidth: recordSize === '1M' ? [
                    output.largest['writes'][0],
                    output.largest['reads'][0],
                    output.largest['randomReads'][0],
                    output.largest['randomWrites'][0],
                ] : null,
                iops: recordSize === '4k' ? [
                    output.largest['writes'][0],
                    output.largest['reads'][0],
                    output.largest['randomReads'][0],
                    output.largest['randomWrites'][0],
                ] : null,
            },
        ],
        tool: 'IOzone',
        date: new Date(),
        testType: recordSize === '1M' ? 'Max-Throughput' : 'Max-IOPS',
    });
}

async function genericFIOBenchmark(options) {
    const {
        threadCount,
        recordSize,
        fileSize,
        testPath,
        ioDepth,
        runtime,
    } = options;

    const typeLut = ['write', 'read', 'randread', 'randwrite'];

    let fioFiles = [];

    let fioOutputs = [];
    let escapedError = false;

    updateProgressBar(0, `0/${typeLut.length}`);

    let idx = 0;

    while (idx < typeLut.length) {
        try {
            let fileName = `fio.${idx}`;

            fioFiles.push(`${testPath}${testPath.endsWith('/') ? '' : '/'}${fileName}.0.0`);

            let args = ['fio', '--directory', testPath, '--name', fileName, '--rw', typeLut[idx], '-bs', recordSize, '--size', fileSize.join(''), '--numjobs', threadCount, '--time_based', '--ramp_time', '5', '--runtime', runtime, '--iodepth', ioDepth, '--group_reporting'].filter(x => x !== null);
    
            let data = await cockpit.spawn(args, { err: 'out', superuser: 'require' });
            
            fioOutputs[idx] = parseFioOutput(data, typeLut[idx].includes('read') ? 'read' : 'write');

            updateProgressBar(((idx + 1) / typeLut.length) * 100, `${idx + 1}/${typeLut.length}`);
        } catch (error) {
            console.log(error);
            escapedError = true;
            break;
        }

        idx += 1;
    }
    
    await deleteFiles(fioFiles);

    benchmarkProcessingSpinner.classList.add('hidden');

    if (escapedError) {
        showErrorAlert('The benchmark ended with a failed state.');
        return;
    }
    
    let output = {
        bytes: {
            writes: null,
            reads: null,
            randomReads: null,
            randomWrites: null,
        },
        largest: {
            writes: null,
            reads: null,
            randomReads: null,
            randomWrites: null,
        },
    };

    output.largest['writes'] = [recordSize === '4k' ? fioOutputs[0].iops : fioOutputs[0].bandwidth, recordSize === '4k' ? 'IOPS' : 'MB/s'];
    output.largest['reads'] = [recordSize === '4k' ? fioOutputs[1].iops : fioOutputs[1].bandwidth, recordSize === '4k' ? 'IOPS' : 'MB/s'];
    output.largest['randomReads'] = [recordSize === '4k' ? fioOutputs[2].iops : fioOutputs[2].bandwidth, recordSize === '4k' ? 'IOPS' : 'MB/s'];
    output.largest['randomWrites'] = [recordSize === '4k' ? fioOutputs[3].iops : fioOutputs[3].bandwidth, recordSize === '4k' ? 'IOPS' : 'MB/s'];

    showSuccessAlert('The benchmark has been completed.');

    benchmarkOutput.classList.remove('hidden');

    displayBenchmarkOutputChart(output, recordSize);

    enableDownload({
        data: [
            {
                recordSize,
                date: new Date(),
                bwUnit: recordSize === '1M' ? 'MB/s' : null,
                bandwidth: recordSize === '1M' ? [
                    fioOutputs[0].bandwidth,
                    fioOutputs[1].bandwidth,
                    fioOutputs[2].bandwidth,
                    fioOutputs[3].bandwidth,
                ] : null,
                iops: recordSize === '4k' ? [
                    fioOutputs[0].iops,
                    fioOutputs[1].iops,
                    fioOutputs[2].iops,
                    fioOutputs[3].iops,
                ] : null,
            },
        ],
        tool: 'FIO',
        date: new Date(),
        testType: recordSize === '1M' ? 'Max-Throughput' : 'Max-IOPS',
    });
}

async function spectrumFIOBenchmark(options) {
    const {
        threadCount,
        recordSizes,
        fileSize,
        testPath,
        ioDepth,
        runtime,
    } = options;

    const typeLut = ['write', 'read', 'randread', 'randwrite'];

    let fioFiles = [];

    let fioOutputs = {};
    let finalOutput = [];

    let escapedError = false;

    updateProgressBar(0, `0/${recordSizes.length * typeLut.length}`);

    let sizeIndex = 0;

    while (sizeIndex < recordSizes.length) {
        let idx = 0;

        let recordSize = recordSizes[sizeIndex];

        fioOutputs[recordSize] = {};

        while (idx < typeLut.length) {
            try {
                let fileName = `fio.${recordSize}.${idx}`;

                fioFiles.push(`${testPath}${testPath.endsWith('/') ? '' : '/'}${fileName}.0.0`);

                let args = ['fio', '--directory', testPath, '--name', fileName, '--rw', typeLut[idx], '-bs', recordSize, '--size', fileSize.join(''), '--numjobs', threadCount, '--time_based', '--ramp_time', '5', '--runtime', runtime, '--iodepth', ioDepth, '--group_reporting'].filter(x => x !== null);
        
                let data = await cockpit.spawn(args, { err: 'out', superuser: 'require' });
                
                fioOutputs[recordSize][idx] = parseFioOutput(data, typeLut[idx].includes('read') ? 'read' : 'write');

                updateProgressBar((((sizeIndex * 4) + (idx + 1)) / (recordSizes.length * typeLut.length)) * 100, `${(sizeIndex * 4) + (idx + 1)}/${recordSizes.length * typeLut.length}`);
            } catch (error) {
                console.log(error);
                escapedError = true;
                break;
            }

            idx += 1;
        }

        let output = {};

        output['date'] = new Date();
        output['recordSize'] = recordSize;
        output['bwUnit'] = 'MB/s';
        output['bandwidth'] = [
            fioOutputs[recordSize][0].bandwidth,
            fioOutputs[recordSize][1].bandwidth,
            fioOutputs[recordSize][2].bandwidth,
            fioOutputs[recordSize][3].bandwidth,
        ];

        output['iops'] = [
            fioOutputs[recordSize][0].iops,
            fioOutputs[recordSize][1].iops,
            fioOutputs[recordSize][2].iops,
            fioOutputs[recordSize][3].iops,
        ];

        finalOutput.push(output);

        sizeIndex += 1;
    }

    await deleteFiles(fioFiles);
    
    benchmarkProcessingSpinner.classList.add('hidden');

    if (escapedError) {
        showErrorAlert('The benchmark ended with a failed state.');
        return;
    }

    showSuccessAlert('The benchmark has been completed.');

    benchmarkOutput.classList.remove('hidden');

    displayBenchmarkOutputChartMany(finalOutput, recordSizes);

    enableDownload({
        data: finalOutput,
        tool: 'FIO',
        testType: 'Performance-Spectrum',
    });
}

function bytesToLargest(x) {
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

function splitNumberLetter(x, provideAvailable) {
    if (!x) return null;
    x = x.toString();
    let number = x.match(/\d*\.?\d*/g)?.join('');
    let string = x.replace(/\d*\.?\d*/g, '');
    if ((!number || !string) && !provideAvailable) return null;

    return [number, string];
}

function alertClasses() {
    const alert = document.querySelector('#benchmark-alert');
    const alertIcon = document.querySelector('#benchmark-alert-icon');
    const alertText = document.querySelector('#benchmark-alert-text');

    return [alert, alertIcon, alertText];
}

function clearAlert() {
    const [alert, alertIcon, alertText] = alertClasses();

    alert.className = 'no-margin';
    alertIcon.className = '';
    alertText.innerHTML = '';
}

function showSuccessAlert(message) {
    const [alert, alertIcon, alertText] = alertClasses();

    clearAlert();

    alert.classList.add("alert", "alert-success");
    alertIcon.classList.add("pficon", "pficon-ok");
    alertText.innerHTML = message;

    setTimeout(() => clearAlert(), 3200);
}

function showErrorAlert(message) {
    const [alert, alertIcon, alertText] = alertClasses();

    clearAlert();

    alert.classList.add("alert", "alert-danger");
    alertIcon.classList.add("pficon", "pficon-error-circle-o");
    alertText.innerHTML = message;

    setTimeout(() => clearAlert(), 3200);
}

function parseIozoneOutput(data, threadCount) {
    let strSnippets = data.match(/(.*)=(.*) kB\/sec/g);
    let objSnippets = strSnippets.map(s => s.split('=').map(x => x.trim()).map((x, i) => i === 1 ? x.split(' ')[0] : x));
    
    let objLut = {};

    let items = objSnippets.reduce((obj, item, index) => {
        let newObj = index % 5 === 0;
        let idx = Math.floor(index / 5);
        let fiveIdx = index % 5;
        let type = objLut[idx];
        
        if (newObj) {
            let name = item[0].replace(/Children see throughput for(\s){1,}/gi, '').replace(new RegExp(threadCount.toString()), '').trim();

            objLut[idx] = name;
            obj[name] = {};
            type = name;
        }

        let key = ['child', 'parent', 'min', 'max', 'avg'][fiveIdx];

        obj[type][key] = item[1];
        return obj;
    }, {});

    return items;
}

function parseFioOutput(data, bmType) {
    let lines = data.split('\n').map(l => l.trim());

    let line = lines.find(l => l.startsWith(`${bmType}:`));

    if (!line) return null;

    let rawIops = splitNumberLetter(line.match(/IOPS=([^)]+),/)[1], true);
    let iops = rawIops[1] === 'k' ? Number(rawIops[0]) * 1000 : Number(rawIops[0]);

    let rawBandwidth = splitNumberLetter(line.match(/BW=([^)]+)\s/)[1], true);

    let bandwidth;

    switch (rawBandwidth[1]) {
        case 'KiB/s':
            bandwidth = ((Number(rawBandwidth[0]) * 1.049) / 1024).toFixed(2);
            break;
        case 'MiB/s':
            bandwidth = (Number(rawBandwidth[0]) * 1.049).toFixed(2);
            break;
        case 'GiB/s':
            bandwidth = ((Number(rawBandwidth[0]) * 1.049) * 1024).toFixed(2);
            break;
        default:
            bandwidth = 0;
            break;
    }

    return {
        iops,
        bandwidth,
    };
}

function transparentize(hex) {
    const colorLib = window['@kurkle/color'];
    return colorLib(hex).alpha(0.5).hexString();
}

function displayBenchmarkOutput(data) {
    const benchmarkOutputReads = document.querySelector('#benchmark-output-reads');
    const benchmarkOutputWrites = document.querySelector('#benchmark-output-writes');
    const benchmarkOutputRandomReads = document.querySelector('#benchmark-output-random-reads');
    const benchmarkOutputRandomWrites = document.querySelector('#benchmark-output-random-writes');

    benchmarkOutputReads.innerHTML = data.largest.reads.join(' ');
    benchmarkOutputWrites.innerHTML = data.largest.writes.join(' ');
    benchmarkOutputRandomReads.innerHTML = data.largest.randomReads.join(' ');
    benchmarkOutputRandomWrites.innerHTML = data.largest.randomWrites.join(' ');
}

function updateProgressBar(percent, desc) {
    const progressBar = benchmarkProgress.querySelector(':scope [role="progressbar"]');
    const progressText = benchmarkProgress.querySelector(':scope .progress-description');
    const progressReader = benchmarkProgress.querySelector(':scope .sr-only');

    progressBar.setAttribute('aria-valuenow', percent);
    progressBar.style.width = `${percent}%`;

    progressText.innerHTML = desc;
    progressReader.innerHTML = `${percent}% Complete`;
}

function showProgressBar() {
    benchmarkProgress.classList.remove('hidden');

    updateProgressBar(0, '0/0');
}

function displayBenchmarkOutputChart(data, label) {
    const benchmarkOutputChart = document.querySelector('#benchmark-output-chart');

    if (benchmarkChart) benchmarkChart.destroy();

    benchmarkChart = new Chart(benchmarkOutputChart, {
        type: 'bar',
        data: {
            labels: [label],
            datasets: [
                {
                    label: 'Reads',
                    data: [Number(data.largest['reads'][0])],
                    backgroundColor: transparentize('#4DC9F6'),
                    borderColor: '#4DC9F6',
                },
                {
                    label: 'Writes',
                    data: [Number(data.largest['writes'][0])],
                    backgroundColor: transparentize('#0A88C7'),
                    borderColor: '#0A88C7',
                },
                {
                    label: 'Random Reads',
                    data: [Number(data.largest['randomReads'][0])],
                    backgroundColor: transparentize('#0E68C5'),
                    borderColor: '#0E68C5',
                },
                {
                    label: 'Random Writes',
                    data: [Number(data.largest['randomWrites'][0])],
                    backgroundColor: transparentize('#0D45C1'),
                    borderColor: '#0D45C1',
                },
            ],
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: true,
                    text: data.largest['writes'][1]
                }
            }
        },
    });
}

function displayBenchmarkOutputChartMany(data, labels, type = 'iops') {
    const benchmarkOutputChart = document.querySelector('#benchmark-output-chart');

    benchmarkChartSwitcher.classList.remove('hidden');

    benchmarkChartData = data;

    let options = {
        type: 'bar',
        data: {
            labels,
            datasets: [
                {
                    label: 'Reads',
                    data: data.map(item => Number(splitNumberLetter(item[type][0], true)[0])),
                    backgroundColor: transparentize('#4DC9F6'),
                    borderColor: '#4DC9F6',
                },
                {
                    label: 'Writes',
                    data: data.map(item => Number(splitNumberLetter(item[type][1], true)[0])),
                    backgroundColor: transparentize('#0A88C7'),
                    borderColor: '#0A88C7',
                },
                {
                    label: 'Random Reads',
                    data: data.map(item => Number(splitNumberLetter(item[type][2], true)[0])),
                    backgroundColor: transparentize('#0E68C5'),
                    borderColor: '#0E68C5',
                },
                {
                    label: 'Random Writes',
                    data: data.map(item => Number(splitNumberLetter(item[type][3], true)[0])),
                    backgroundColor: transparentize('#0D45C1'),
                    borderColor: '#0D45C1',
                },
            ],
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: true,
                    text: type === 'iops' ? 'IOPS' : 'Bandwidth (MB/s)',
                }
            }
        },
    };

    if (benchmarkChart) benchmarkChart.destroy();

    benchmarkChart = new Chart(benchmarkOutputChart, options);
}

async function deleteFiles(files = []) {
    try {
        await cockpit.spawn(['rm', '-f', ...files], { err: 'out', superuser: 'require' });
    } catch (error) {
        console.log(error);
    }
}

async function isValidDirectory(path) {
    try {
        const res = await cockpit.spawn(['/usr/share/cockpit/benchmark/scripts/exists.py', path], { err: 'out', superuser: 'require' });

        const result = res.trim();

        return result === 'y';
    } catch (error) {
        console.log(error);
        return false;
    }
}

function getSheetFormat() {
    const formats = [...document.querySelectorAll('[name="download-format"]')];
    return formats.find(el => el.checked)?.value;
}

function resetDownload() {
    benchmarkData = null;
    downloadBenchmarkBtn.setAttribute('disabled', true);
}

function enableDownload(data) {
    benchmarkData = data;
    downloadBenchmarkBtn.removeAttribute('disabled');
}

function generateSheet(data) {
    if (data === null) return;

    const date = data.date ?? new Date();

    const aoa = [
        [
            'Tool', 
            data.testType !== null ? 'Test Type' : null,
            'Record Size', 
            'Date',
            ...(data.data[0].bandwidth ? [`Reads (${data.data[0].bwUnit})`, `Writes (${data.data[0].bwUnit})`, `Random Reads (${data.data[0].bwUnit})`, `Random Writes (${data.data[0].bwUnit})`] : []),
            ...(data.data[0].iops ? [`Reads (IOPS)`, `Writes (IOPS)`, `Random Reads (IOPS)`, `Random Writes (IOPS)`] : []),
        ].filter(x => x !== null),
        ...data.data.map(x => [
            data.tool,
            data.testType ?? null,
            x.recordSize,
            x.date.toLocaleString(),
            x.bandwidth?.[0],
            x.bandwidth?.[1],
            x.bandwidth?.[2],
            x.bandwidth?.[3],
            x.iops?.[0],
            x.iops?.[1],
            x.iops?.[2],
            x.iops?.[3],
        ].filter(x => (x ?? null) !== null)),
    ];

    const wb = XLSX.utils.book_new();

    const ws = XLSX.utils.aoa_to_sheet(aoa);

    XLSX.utils.book_append_sheet(wb, ws, 'Benchmarks');

    XLSX.writeFile(wb, `benchmark-${data.tool}-${data.testType}-${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}-${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}${String(date.getSeconds()).padStart(2, '0')}-${date.getTime()}.${getSheetFormat()}`);
}

downloadBenchmarkBtn.addEventListener('click', () => {
    generateSheet(benchmarkData);
});