export class DownloadManager {
    constructor() {
        this.data = null;
    }

    setupButton() {
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