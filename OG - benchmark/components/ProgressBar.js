import { benchmarkProcessingSpinner, benchmarkProgress } from './elements.js';

export class ProgressBar {
    static update(percent, desc) {
        const progressBar = benchmarkProgress.querySelector(':scope [role="progressbar"]');
        const progressText = benchmarkProgress.querySelector(':scope .progress-description');
        const progressReader = benchmarkProgress.querySelector(':scope .sr-only');
    
        progressBar.setAttribute('aria-valuenow', percent);
        progressBar.style.width = `${percent}%`;
    
        progressText.innerHTML = desc;
        progressReader.innerHTML = `${percent}% Complete`;
    }
    
    static show() {
        benchmarkProgress.classList.remove('hidden');
    
        ProgressBar.update(0, '0/0');
    }

    static start() {
        benchmarkProcessingSpinner.classList.remove('hidden');
    }

    static stop() {
        benchmarkProcessingSpinner.classList.add('hidden');
    }
}
