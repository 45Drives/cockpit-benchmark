const benchmarkToolFio = document.querySelector('#benchmark-tool-fio');
const benchmarkToolIozone = document.querySelector('#benchmark-tool-iozone');
const benchmarkTypeThroughput = document.querySelector('#benchmark-type-throughput');
const benchmarkTypeIops = document.querySelector('#benchmark-type-iops');
const benchmarkSize = document.querySelector('#benchmark-size');
const benchmarkPath = document.querySelector('#benchmark-path');
const benchmarkProcessingSpinner = document.querySelector('#benchmark-processing-spinner');

const benchmarkForm = document.querySelector('#benchmark-form');
const launchBenchmarkBtn = document.querySelector('#launch-benchmark');

const benchmarkOutput = document.querySelector('#benchmark-output');

let benchmarkChart = null;

benchmarkForm.addEventListener('submit', e => e.preventDefault());

launchBenchmarkBtn.addEventListener('click', async () => {
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

    let testPath = benchmarkPath.value;

    if (!testPath) {
        showErrorAlert('You did not provide a test path.');
        return;
    }

    benchmarkProcessingSpinner.classList.remove('hidden');

    if (benchmarkChart) {
        benchmarkChart.destroy();
        benchmarkOutput.classList.add('hidden');
    }

    if (toolName === 'iozone') {
        iozoneBenchmark(threadCount, recordSize, fileSize);
    }

    if (toolName === 'fio') {
        fioBenchmark(threadCount, recordSize, fileSize, testPath);
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

    displayBenchmarkOutput(output);
    displayBenchmarkOutputChart(output);
}

async function fioBenchmark(threadCount, recordSize, fileSize, testPath) {
    const runtime = 5;
    const typeLut = ['write', 'read', 'randread', 'randwrite'];

    let fioOutputs = [];
    let escapedError = false;

    let idx = 0;

    while (idx < 4) {
        try {
            let args = ['fio', '--directory', testPath, '--name', `zfs.fio.${idx}`, '--rw', typeLut[idx], '-bs', recordSize, '--size', fileSize.join(''), '--numjobs', threadCount, '--time_based', '--runtime', runtime, '--group_reporting'].filter(x => x !== null);
    
            let data = await cockpit.spawn(args, { err: 'out', superuser: 'require' });
            
            fioOutputs[idx] = parseFioOutput(data, typeLut[idx].includes('read') ? 'read' : 'write');
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

    //4k=iops 1M=throughput

    output.largest['writes'] = [recordSize === '4k' ? fioOutputs[0].iops : fioOutputs[0].bandwidth, recordSize === '4k' ? 'IOPS' : 'MB/s'];
    output.largest['reads'] = [recordSize === '4k' ? fioOutputs[1].iops : fioOutputs[1].bandwidth, recordSize === '4k' ? 'IOPS' : 'MB/s'];
    output.largest['randomReads'] = [recordSize === '4k' ? fioOutputs[2].iops : fioOutputs[2].bandwidth, recordSize === '4k' ? 'IOPS' : 'MB/s'];
    output.largest['randomWrites'] = [recordSize === '4k' ? fioOutputs[3].iops : fioOutputs[3].bandwidth, recordSize === '4k' ? 'IOPS' : 'MB/s'];

    showSuccessAlert('The benchmark has been completed.');

    benchmarkOutput.classList.remove('hidden');

    displayBenchmarkOutput(output);
    displayBenchmarkOutputChart(output);
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

    let bandwidth = (Number(rawBandwidth[0]) * 1.049).toFixed(2);

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

function displayBenchmarkOutputChart(data) {
    const benchmarkOutputChart = document.querySelector('#benchmark-output-chart');

    const colors = ['#4DC9F6', '#0A88C7', '#0E68C5', '#0D45C1'];
    const rawData = [data.largest['writes'], data.largest['reads'], data.largest['randomReads'], data.largest['randomWrites']];

    let content = rawData.map(d => d[0]);

    benchmarkChart = new Chart(benchmarkOutputChart, {
        type: 'bar',
        data: {
            labels: ['Reads', 'Writes', 'Random Reads', 'Random Writes'],
            datasets: [
                {
                    label: data.largest['writes'][1],
                    data: content,
                    backgroundColor: colors.map(hex => transparentize(hex)),
                    borderColor: colors,
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
                    display: false,
                    text: 'Throughput'
                }
            }
        },
    });
}