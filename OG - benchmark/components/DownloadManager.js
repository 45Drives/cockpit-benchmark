import { downloadBenchmarkBtn } from './elements.js';
import { SheetManager } from './SheetManager.js';

export class DownloadManager {
    constructor() {
        this.data = null;
    }

    initialize() {
        downloadBenchmarkBtn.addEventListener('click', () => {
            SheetManager.generate(this.data);
        });
    }

    reset() {
        this.data = null;
        downloadBenchmarkBtn.setAttribute('disabled', true);
    }
    
    enable(data) {
        this.data = data;
        downloadBenchmarkBtn.removeAttribute('disabled');
    }
}