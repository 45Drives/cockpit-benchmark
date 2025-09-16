<template>
  <div class="h-full flex flex-col overflow-hidden">
    <HoustonHeader moduleName="Benchmarks" sourceURL="https://github.com/45Drives/cockpit-benchmark"
      issuesURL="https://github.com/45Drives/cockpit-benchmark/issues" :pluginVersion="pluginVersion"
      :infoNudgeScrollbar="true" />

    <div class="w-full px-8 bg-well text-default grow flex flex-col overflow-y-auto py-8">

      <div id="benchmarkForm" class="max-w-4xl card mx-auto w-full text-left">
        <div class="card-body gap-content flex flex-col items-stretch">
          <div id="toolDiv">
            <label class="text-label">Benchmark Tool</label>
            <select id="benchmarkTool" v-model="benchmarkTool" class="input-textlike w-full">
              <option value="fio" selected>FIO</option>
            </select>
          </div>

          <div id="typeDiv">
            <label class="text-label">Benchmark Type</label>
            <select id="benchmarkType" v-model="benchmarkType" class="input-textlike w-full">
              <option value="throughput">Max Throughput</option>
              <option value="iops">Max IOPS</option>
              <option value="spectrum">Performance Spectrum</option>
            </select>
          </div>

          <div id="sizeDiv">
            <label class="text-label mr-2">File Size</label>
            <div class="relative rounded-md shadow-sm inline w-full">
              <input @change="fileSizeNum()" id="fileSize" v-model="fileSize" type="text"
                class="pr-12 input-textlike w-full sm:w-auto" />
              <div class="absolute inset-y-0 right-0 flex items-center">
                <label class="sr-only">Unit</label>
                <select id="fileSizeUnit" v-model="fileSizeUnit"
                  class="input-textlike border-transparent bg-transparent">
                  <option :value="1024 ** 2">MiB</option>
                  <option :value="1024 ** 3">GiB</option>
                </select>
              </div>
            </div>
            <p class="text-danger" v-if="fileSizeNumFeedback">{{ fileSizeNumFeedback }}</p>
          </div>

          <div id="depthDiv">
            <label class="text-label mr-2">IO Depth</label>
            <select id="ioDepth" v-model="ioDepth" class="input-textlike bg-transparent">
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="4">4</option>
              <option value="8">8</option>
              <option value="16" selected>16</option>
              <option value="32">32</option>
              <option value="64">64</option>
              <option value="128">128</option>
            </select>
          </div>

          <div id="timeDiv">
            <label class="text-label mr-2">Runtime</label>
            <input @change="runtimeCheck()" id="runtime" v-model="runtime" type="number" class="input-textlike"
              default="2" />
            <p class="text-danger" v-if="runtimeFeedback">{{ runtimeFeedback }}</p>
          </div>

          <div id="pathDiv">
            <label class="text-label mr-2">Test Path</label>
            <input @change="validateFilePath()" id="testPath" v-model="testPath" type="text" class="input-textlike"
              placeholder="/mnt/hdd" />
            <p class="text-danger" v-if="testPathFeedback">{{ testPathFeedback }}</p>
          </div>

          <div id="outputDiv">
            <div class="progress-container progress-description-left mt-1" :class="{ hidden: hiddenProgBar }">
              <div class="progress-description">
                <div class="flex justify-between mb-1">
                  <span class="text-default float-left" :class="{ hidden: hiddenProgBar }">{{
                      benchmarkFeedback
                  }}</span>
                  <span ref="benchPercent" class="text-default float-right" :class="{ hidden: hiddenProgBar }">{{
                      progPercent.toFixed(1)
                  }}%</span>
                </div>
                <div class="bg-gray-200 rounded-full overflow-hidden" :class="{ hidden: hiddenProgBar }">
                  <div class="h-4 bg-slate-500 rounded-full" :style="{ width: `${progPercent}%` }">
                  </div>
                </div>
              </div>
            </div>
            <div class="benchmark-output mt-6 text-center float-left" :class="{ hidden: hiddenOutput }">
              <label class="text-label mr-2">Download Format</label>
              <select id="downloadFormat" v-model="downloadFormat" class="input-textlike bg-transparent">
                <option value="xlsx">XLSX</option>
                <option value="csv">CSV</option>
                <option value="ods">ODS</option>
              </select>
              <div class="float-right ml-10" :class="{ hidden: hiddenChart }">
                <label class="text-label mr-2">Chart Output</label>
                <select v-model="chartType" class="switcher input-textlike bg-transparent"
                  :class="{ hidden: hiddenChart }">
                  <option id="chart-type-iops" value="iops" selected>IOPS</option>
                  <option id="chart-type-bandwidth" value="bandwidth">Bandwidth</option>
                </select>
              </div>
            </div>
          </div>

          <div id="chartDiv">
            <BarChart id="chart" ref="chartRef" :key="componentKey" :chartData="results" :labels="recordSizes"
              :dataType="chartType" class="bg-white" v-if="!hiddenChart" />
          </div>

        </div>
        <div id="buttonDiv" class="card-footer button-group-row">
          <button id="launchBenchmarkBtn" class="btn btn-primary" @click="launchTests()"
            :disabled="!pathValid || testInProgress || !numberValid || !runtimeValid">Launch</button>
          <button id="downloadBenchmarkBtn" class="btn btn-primary" :disabled="testInProgress || !testCompleted"
            @click="genSheet(results)">Download
            Report</button>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup>
import "@45drives/cockpit-css/src/index.css";
import { useSpawn, objectURLDownload } from "@45drives/cockpit-helpers";
import { ref, computed, watch } from "vue";
import mergeDeep from "./assignObjectRecursive";
import * as XLSX from 'xlsx/xlsx.mjs';
import BarChart from './components/BarChart.vue';
import { HoustonHeader } from "@45drives/cockpit-vue-components";
import "@45drives/cockpit-vue-components/dist/style.css";
import { pluginVersion } from "./version";

const benchmarkTool = ref('fio');
const benchmarkType = ref('throughput');
const fileSize = ref(1);
const fileSizeUnit = ref(1024 ** 3);
const ioDepth = ref('16');
const runtime = ref('2');
const testPath = ref('');
const testSize = computed(() => fileSize.value * fileSizeUnit.value);
const chartType = ref("iops");
const progPercent = ref(0);
const downloadFormat = ref("xlsx");

const pathValid = ref(true);
const numberValid = ref(true);
const runtimeValid = ref(true);
const testPathFeedback = ref('');
const fileSizeNumFeedback = ref('');
const benchmarkFeedback = ref('');
const runtimeFeedback = ref('');
const testInProgress = ref(false);
const testCompleted = ref(false);

const hiddenProgBar = ref(true);
const hiddenOutput = ref(true);
const hiddenChart = ref(true);
const benchPercent = ref('');

const results = ref([]);
const recordSizes = ref([]);

const componentKey = ref(0);
const chartRef = ref();

const forceRerender = () => {
  if (chartRef.value?.chart) {
    chartRef.value.chart.destroy();
    chartRef.value = null;
  }
  componentKey.value += 1;
  hiddenChart.value = true;
};

async function validateFilePath() {
	let result = true;
	testPathFeedback.value = '';
	if (testPath.value !== '') {
		if (!(await checkIfExists(testPath.value))) {
			result = false;
			testPathFeedback.value = 'Path does not exist';
		} 
	} else {
		result = false;
		testPathFeedback.value = 'Path is required';
	}
	pathValid.value = result;
}

const checkIfExists = async (path) => {
  try {
    await useSpawn(['test', '-d', path], { superuser: 'try' }).promise();
    return true;
  } catch (error) {
    return false;
  }
};

function fileSizeNum() {
  let result = true;
  fileSizeNumFeedback.value = '';
  if (fileSize.value == 0 || isNaN(fileSize.value)) {
    result = false;
    fileSizeNumFeedback.value = 'Please enter numeric values only';
  }
  numberValid.value = result;
}

function runtimeCheck() {
  let result = true;
  runtimeFeedback.value = '';
  if (runtime.value == 0 || isNaN(runtime.value)) {
    result = false;
    runtimeFeedback.value = 'Please enter a valid runtime';
  }
  runtimeValid.value = result;
}

async function launchTests() {
	await validateFilePath();
	if (pathValid.value) {
		forceRerender();
		hiddenOutput.value = true;
		hiddenProgBar.value = false;
		testCompleted.value = false;
		testInProgress.value = true;
		benchmarkFeedback.value = 'Testing...';

		const testTypes = ['write', 'read', 'randread', 'randwrite'];
		const testResults = [];
		recordSizes.value = [];
		const fileName = 'FIO-Benchmark';

		if (benchmarkType.value == 'throughput') {
			recordSizes.value.push('1M');
			chartType.value = 'bandwidth';
		} else if (benchmarkType.value == 'iops') {
			recordSizes.value.push('4k');
		} else if (benchmarkType.value == 'spectrum') {
			recordSizes.value.push('4k', '8k', '16k', '32k', '64k', '128k', '512k', '1M');
		}
		progPercent.value = 0;
		for (const recordSize of recordSizes.value) {
			const result = await runFioJobs({
			threadCount: 1,
			recordSize,
			recordSizes: recordSizes.value,
			fileName,
			fileSize: testSize.value,
			testPath: testPath.value,
			ioDepth: ioDepth.value,
			runtime: runtime.value,
			}, testTypes.length)

			testResults.push(result)
		}

		results.value = testResults;

		benchmarkFeedback.value = 'Testing completed.';
		testInProgress.value = false;
		testCompleted.value = true;
		hiddenOutput.value = false;
		hiddenChart.value = false;

		let file = fileName + '.0.0';
		await deleteFiles(file);
	} 
}

async function runFioJobs({
  threadCount, recordSize, recordSizes, fileName, fileSize, testPath, ioDepth, runtime,
}, totalJobs) {
  const testTypes = ['write', 'read', 'randread', 'randwrite'];
  const results = {};
  for (const testType of testTypes) {

    const result = await runFioJob({
      threadCount, recordSize, fileName, fileSize, testPath, ioDepth, runtime, testType
    })

    mergeDeep(results, result);
    progPercent.value += 100 / recordSizes.length / totalJobs;
  }
  return results;
}
const ioEngine = computed(() => Number(ioDepth.value) > 1 ? 'libaio' : 'psync');

async function runFioJob({
  threadCount, recordSize, fileName, fileSize, testPath, ioDepth, runtime, testType
}) {
  try {
    let args = [
        benchmarkTool.value,
        '--directory', testPath,
        '--name', fileName,
        '--rw', testType,
        '--bs', recordSize,
        '--size', fileSize,
        '--numjobs', threadCount,
        '--time_based', '--ramp_time', '5',
        '--runtime', runtime,
        '--iodepth', ioDepth,
        '--ioengine', ioEngine.value,
        '--direct', '1',
        '--group_reporting',
        '--eta=never',
        '--output-format=json'
      ];
    const proc = await useSpawn(args, { superuser: 'try' }).promise();

    const raw = String(proc.stdout ?? '');
    const start = raw.indexOf('{');
    if (start < 0) throw new Error(`fio did not return JSON: ${raw.slice(0, 120)}`);
    const output = JSON.parse(raw.slice(start));

    const [job] = output.jobs;

    switch (testType) {
      case 'write':
        return {
          name: job.jobname,
          tool: benchmarkTool.value,
          type: benchmarkType.value,
          recSize: recordSize,
          iops: {
            write: (job.write.iops.toFixed(0))
          },
          bandwidth: {
            write: (job.write.bw / 1024).toFixed(2)
          },
        }
      case 'read':
        return {
          iops: {
            read: (job.read.iops.toFixed(0))
          },
          bandwidth: {
            read: (job.read.bw / 1024).toFixed(2)
          },
        }
      case 'randread':
        return {
          iops: {
            randread: (job.read.iops.toFixed(0))
          },
          bandwidth: {
            randread: (job.read.bw / 1024).toFixed(2)
          },
        }
      case 'randwrite':
        return {
          iops: {
            randwrite: (job.write.iops.toFixed(0))
          },
          bandwidth: {
            randwrite: (job.write.bw / 1024).toFixed(2)
          },
        }
    }
    return {
    }
  } catch (error) {
    console.error(error);
  }
}

const deleteFiles = async (file) => {
  try {
    // await useSpawn(['sh', '-c', `rm -f ${testPath.value}/${file}`]).promise();
    await useSpawn(['sh', '-c', `rm -f ${testPath.value}/${file}`], { superuser: 'try' }).promise();
  } catch (error) {
    console.error(error);
  }
}

function genSheet(data) {
  if (!Array.isArray(data) || data.length === 0) return;

  const date = data.date ?? new Date();

  const aoa = [
    [
      'Tool',
      data[0].type ? 'Test Type' : null,
      'Record Size',
      'Date',
      'Reads (MB/s)',
      'Writes (MB/s)',
      'Random Reads (MB/s)',
      'Random Writes (MB/s)',
      `Reads (IOPS)`,
      `Writes (IOPS)`,
      `Random Reads (IOPS)`,
      `Random Writes (IOPS)`,
    ], ...data.map(result => ([
      result.tool,
      result.type ?? null,
      result.recSize,
      date.toLocaleString(),
      result.bandwidth?.read ?? '',
      result.bandwidth?.write ?? '',
      result.bandwidth?.randread ?? '',
      result.bandwidth?.randwrite ?? '',
      result.iops?.read ?? '',
      result.iops?.write ?? '',
      result.iops?.randread ?? '',
      result.iops?.randwrite ?? '',
    ]))
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(aoa)

  XLSX.utils.book_append_sheet(wb, ws, 'Benchmarks');

  const dateFormatted = `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`;
  const timeFormatted = `${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}${String(date.getSeconds()).padStart(2, '0')}-${date.getTime()}`;

  const fileName = `benchmark-${data[0].tool}-${data[0].type}-${dateFormatted}-${timeFormatted}.${downloadFormat.value}`;

  if (window.chrome) {
    XLSX.writeFile(wb,
      fileName
    );
  } else {
    const fileData = XLSX.write(wb, { bookType: downloadFormat.value, type: 'array' });

    objectURLDownload(fileData, fileName);
  }

}

watch(chartType, () => {
  if (hiddenChart.value == false) {
    forceRerender();
    hiddenChart.value = false;
  }
})
</script>
