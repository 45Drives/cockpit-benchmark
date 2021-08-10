import { DisplayManager } from './DisplayManager.js';
import { DownloadManager } from './DownloadManager.js';
import { deleteFiles, runCommand, showErrorAlert, showSuccessAlert, splitNumberLetter } from './functions.js';
import { ProgressBar } from './ProgressBar.js';

export class FIOManager {
    /**
     * 
     * @param {DownloadManager} downloadManager
     * @param {DisplayManager} displayManager
     */
    constructor(downloadManager, displayManager) {
        this.downloadManager = downloadManager;
        this.displayManager = displayManager;
    }

    async generic(options) {
        const {
            threadCount,
            recordSize,
            fileSize,
            testPath,
            ioDepth,
            runtime,
        } = options;
    
        const typeLut = ['write', 'read', 'randread', 'randwrite'];
        
        let fioOutputs = [];
        let escapedError = false;
    
        ProgressBar.update(0, `0/${typeLut.length}`);
    
        let idx = 0;
    
        while (idx < typeLut.length) {
            try {
                let fileName = `fio.${idx}`;
    
                await deleteFiles([`${testPath}${testPath.endsWith('/') ? '' : '/'}${fileName}.*`]);
    
                let args = ['fio', '--directory', testPath, '--name', fileName, '--rw', typeLut[idx], '-bs', recordSize, '--size', fileSize.join(''), '--numjobs', threadCount, '--time_based', '--ramp_time', '5', '--runtime', runtime, '--iodepth', ioDepth, '--group_reporting'].filter(x => x !== null);
        
                let data = await runCommand(args);
                
                fioOutputs[idx] = this.parse(data, typeLut[idx].includes('read') ? 'read' : 'write');
    
                ProgressBar.update(((idx + 1) / typeLut.length) * 100, `${idx + 1}/${typeLut.length}`);
            } catch (error) {
                console.error(error);
                escapedError = true;
                break;
            }
    
            idx += 1;
        }
            
        ProgressBar.stop();
    
        if (escapedError) {
            showErrorAlert('The benchmark ended with a failed state.');
            return;
        }
        
        let output = {
            writes: null,
            reads: null,
            randomReads: null,
            randomWrites: null,
        };
    
        output['writes'] = [recordSize === '4k' ? fioOutputs[0].iops : fioOutputs[0].bandwidth, recordSize === '4k' ? 'IOPS' : 'MB/s'];
        output['reads'] = [recordSize === '4k' ? fioOutputs[1].iops : fioOutputs[1].bandwidth, recordSize === '4k' ? 'IOPS' : 'MB/s'];
        output['randomReads'] = [recordSize === '4k' ? fioOutputs[2].iops : fioOutputs[2].bandwidth, recordSize === '4k' ? 'IOPS' : 'MB/s'];
        output['randomWrites'] = [recordSize === '4k' ? fioOutputs[3].iops : fioOutputs[3].bandwidth, recordSize === '4k' ? 'IOPS' : 'MB/s'];
    
        showSuccessAlert('The benchmark has been completed.');
    
        this.displayManager.outputChart(output, recordSize);
    
        this.displayManager.show();

        this.downloadManager.enable({
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

    async spectrum(options) {
        const {
            threadCount,
            recordSizes,
            fileSize,
            testPath,
            ioDepth,
            runtime,
        } = options;
    
        const typeLut = ['write', 'read', 'randread', 'randwrite'];
    
        let fioOutputs = {};
        let finalOutput = [];
    
        let escapedError = false;
    
        ProgressBar.update(0, `0/${recordSizes.length * typeLut.length}`);
    
        let sizeIndex = 0;
    
        while (sizeIndex < recordSizes.length) {
            let idx = 0;
    
            let recordSize = recordSizes[sizeIndex];

            fioOutputs[recordSize] = {};
    
            while (idx < typeLut.length) {
                try {
                    let fileName = `fio.${recordSize}.${idx}`;
    
                    await deleteFiles([`${testPath}${testPath.endsWith('/') ? '' : '/'}${fileName}.*`]);
    
                    let args = ['fio', '--directory', testPath, '--name', fileName, '--rw', typeLut[idx], '-bs', recordSize, '--size', fileSize.join(''), '--numjobs', threadCount, '--time_based', '--ramp_time', '5', '--runtime', runtime, '--iodepth', ioDepth, '--group_reporting'].filter(x => x !== null);
            
                    let data = await runCommand(args);
                    
                    fioOutputs[recordSize][idx] = this.parse(data, typeLut[idx].includes('read') ? 'read' : 'write');
    
                    ProgressBar.update((((sizeIndex * 4) + (idx + 1)) / (recordSizes.length * typeLut.length)) * 100, `${(sizeIndex * 4) + (idx + 1)}/${recordSizes.length * typeLut.length}`);
                } catch (error) {
                    console.error(error);
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
                fioOutputs[recordSize][0]?.bandwidth,
                fioOutputs[recordSize][1]?.bandwidth,
                fioOutputs[recordSize][2]?.bandwidth,
                fioOutputs[recordSize][3]?.bandwidth,
            ];
    
            output['iops'] = [
                fioOutputs[recordSize][0]?.iops,
                fioOutputs[recordSize][1]?.iops,
                fioOutputs[recordSize][2]?.iops,
                fioOutputs[recordSize][3]?.iops,
            ];

            if (output['bandwidth'].includes(undefined) || output['iops'].includes(undefined)) {
                console.error(output);
            }
    
            finalOutput.push(output);
    
            sizeIndex += 1;
        }
        
        ProgressBar.stop();
    
        if (escapedError) {
            showErrorAlert('The benchmark ended with a failed state.');
            return;
        }
    
        showSuccessAlert('The benchmark has been completed.');
    
        this.displayManager.outputChartMany(finalOutput, recordSizes);
    
        this.displayManager.show();

        this.downloadManager.enable({
            data: finalOutput,
            tool: 'FIO',
            testType: 'Performance-Spectrum',
        });
    }

    parse(data, bmType) {
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
}