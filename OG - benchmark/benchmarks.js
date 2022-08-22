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

import { benchmarkForm, chartTypeBandwidth, chartTypeIops, launchBenchmarkBtn } from './components/elements.js';
import { launchBenchmark } from './components/functions.js';
import { FIOManager } from './components/FIOManager.js';
import { DownloadManager } from './components/DownloadManager.js';
import { DisplayManager } from './components/DisplayManager.js';

const downloadManager = new DownloadManager();
const displayManager = new DisplayManager();
const fioManager = new FIOManager(downloadManager, displayManager);

downloadManager.initialize();

chartTypeIops.addEventListener('input', event => {
    if (event.target.checked) {
        displayManager.outputChartMany(false, false, 'iops');
    }
});

chartTypeBandwidth.addEventListener('input', event => {
    if (event.target.checked) {
        displayManager.outputChartMany(false, false, 'bandwidth');
    }
});

benchmarkForm.addEventListener('submit', e => e.preventDefault());

launchBenchmarkBtn.addEventListener('click', () => launchBenchmark(downloadManager, displayManager, fioManager));