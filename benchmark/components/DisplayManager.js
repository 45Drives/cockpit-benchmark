import { benchmarkChartSwitcher, benchmarkOutput } from './elements.js';
import { transparentize } from './functions.js';

export class DisplayManager {
    constructor() {
        this.data = null;
    }

    resetChart() {
        if (this.chart) this.chart.destroy();
    }

    output(data) {
        this.data = data;

        const benchmarkOutputReads = document.querySelector('#benchmark-output-reads');
        const benchmarkOutputWrites = document.querySelector('#benchmark-output-writes');
        const benchmarkOutputRandomReads = document.querySelector('#benchmark-output-random-reads');
        const benchmarkOutputRandomWrites = document.querySelector('#benchmark-output-random-writes');
    
        benchmarkOutputReads.innerHTML = data['reads'].join(' ');
        benchmarkOutputWrites.innerHTML = data['writes'].join(' ');
        benchmarkOutputRandomReads.innerHTML = data['randomReads'].join(' ');
        benchmarkOutputRandomWrites.innerHTML = data['randomWrites'].join(' ');
    }

    outputChart(data, label) {
        const benchmarkOutputChart = document.querySelector('#benchmark-output-chart');

        this.data = data;

        const options = {
            type: 'bar',
            data: {
                labels: [label],
                datasets: [
                    {
                        label: 'Reads',
                        data: [Number(data['reads'][0])],
                        backgroundColor: transparentize('#4DC9F6'),
                        borderColor: '#4DC9F6',
                    },
                    {
                        label: 'Writes',
                        data: [Number(data['writes'][0])],
                        backgroundColor: transparentize('#0A88C7'),
                        borderColor: '#0A88C7',
                    },
                    {
                        label: 'Random Reads',
                        data: [Number(data['randomReads'][0])],
                        backgroundColor: transparentize('#0E68C5'),
                        borderColor: '#0E68C5',
                    },
                    {
                        label: 'Random Writes',
                        data: [Number(data['randomWrites'][0])],
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
                        text: data['writes'][1]
                    }
                }
            },
        };

        this.resetChart();
    
        this.chart = new Chart(benchmarkOutputChart, options);
    }
    
    outputChartMany(data, labels, type = 'iops') {
        const benchmarkOutputChart = document.querySelector('#benchmark-output-chart');
    
        benchmarkChartSwitcher.classList.remove('hidden');
    
        if (data !== false) {
            this.data = data;
        }

        if (labels !== false) {
            this.labels = labels;
        }
    
        const options = {
            type: 'bar',
            data: {
                labels: this.labels,
                datasets: [
                    {
                        label: 'Reads',
                        data: this.data.map(item => Number(splitNumberLetter(item[type][0], true)[0])),
                        backgroundColor: transparentize('#4DC9F6'),
                        borderColor: '#4DC9F6',
                    },
                    {
                        label: 'Writes',
                        data: this.data.map(item => Number(splitNumberLetter(item[type][1], true)[0])),
                        backgroundColor: transparentize('#0A88C7'),
                        borderColor: '#0A88C7',
                    },
                    {
                        label: 'Random Reads',
                        data: this.data.map(item => Number(splitNumberLetter(item[type][2], true)[0])),
                        backgroundColor: transparentize('#0E68C5'),
                        borderColor: '#0E68C5',
                    },
                    {
                        label: 'Random Writes',
                        data: this.data.map(item => Number(splitNumberLetter(item[type][3], true)[0])),
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
    
        this.resetChart();
    
        this.chart = new Chart(benchmarkOutputChart, options);
    }

    show() {
        benchmarkOutput.classList.remove('hidden');
    }

    hide() {
        benchmarkOutput.classList.add('hidden');
        benchmarkChartSwitcher.classList.add('hidden');
    }
}