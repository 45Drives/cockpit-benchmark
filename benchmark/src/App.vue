<template>
  <div id="benchmarkForm" class="centered-column w-full gap-content flex flex-col items-stretch text-left">
    <label class="text-header">Benchmarks</label>

    <div>
      <label class="text-label">Benchmark Tool</label>
      <select id="benchmarkTool" v-model="benchmarkTool" class="input-textlike w-full">
        <option value="fio" selected>FIO</option>
      </select>
    </div>

    <div>
      <label class="text-label">Benchmark Type</label>
      <select id="benchmarkType" v-model="benchmarkType" class="input-textlike w-full">
        <option value="throughput">Max Throughput</option>
        <option value="iops">Max IOPS</option>
        <option value="spectrum">Performance Spectrum</option>
      </select>
    </div>

    <div>
      <label class="text-label mr-2">File Size</label>
      <div class="relative rounded-md shadow-sm inline w-full">
        <input @change="fileSizeNum()" id="fileSize" v-model="fileSize" type="text"
          class="pr-12 input-textlike w-full sm:w-auto" />
        <div class="absolute inset-y-0 right-0 flex items-center">
          <label class="sr-only">Unit</label>
          <select id="fileSizeUnit" v-model="fileSizeUnit" class="input-textlike border-transparent bg-transparent">
            <option :value="1024 ** 2">MiB</option>
            <option :value="1024 ** 3">GiB</option>
          </select>
        </div>
      </div>
      <p class="text-danger" v-if="fileSizeNumFeedback">{{ fileSizeNumFeedback }}</p>
    </div>

    <div>
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

    <div>
      <label class="text-label mr-2">Runtime</label>
      <input @change="runtimeCheck()" id="runtime" v-model="runtime" type="number" class="input-textlike" default="2" />
      <p class="text-danger" v-if="runtimeFeedback">{{ runtimeFeedback }}</p>
    </div>

    <div>
      <label class="text-label mr-2">Test Path</label>
      <input @change="validateFilePath()" id="testPath" v-model="testPath" type="text" class="input-textlike"
        placeholder="/mnt/hdd" />
      <p class="text-danger" v-if="testPathFeedback">{{ testPathFeedback }}</p>
    </div>

    <div>
      <button id="launchBenchmarkBtn" class="btn btn-primary mt-2 mr-2" @click="launchTests()"
        :disabled="!pathValid || testInProgress || !numberValid || !runtimeValid">Launch</button>
      <button id="downloadBenchmarkBtn" class="btn btn-primary mt-2 ml-2" :disabled="testInProgress || !testCompleted"
        @click="genSheet(results)">Download
        Report</button>
      <div ref="benchProg" class="progress-container progress-description-left mt-4" :class="{ hidden: hiddenProgBar }">
        <div class="progress-description">
          <div class="flex justify-between mb-1">
            <span ref="benchStatus" class="text-secondary float-left" :class="{ hidden: hiddenProgBar }">{{
                benchmarkFeedback
            }}</span>
            <span ref="benchPercent" class="text-secondary float-right" :class="{ hidden: hiddenProgBar }">{{
                progPercent.toFixed(1)
            }}%</span>
          </div>
          <div class="bg-gray-200 rounded-full overflow-hidden" :class="{ hidden: hiddenProgBar }">
            <div class="h-3 bg-slate-500 rounded-full" :style="{ width: `${progPercent}%` }">
            </div>
          </div>
        </div>
      </div>
      <div ref="benchOut" class="benchmark-output mt-6 text-center float-left" :class="{ hidden: hiddenOutput }">
        <label class="text-label mr-2">Download Format</label>
        <select id="downloadFormat" v-model="downloadFormat" class="input-textlike bg-transparent">
          <option value="xlsx">XLSX</option>
          <option value="csv">CSV</option>
          <option value="ods">ODS</option>
        </select>
        <div ref="chartOut" class=" float-right" :class="{ hidden: hiddenOutput }">
          <label class="text-label mr-2">Output</label>
          <select ref="chartOut" v-model="chartType" class="switcher input-textlike bg-transparent"
            :class="{ hidden: hiddenOutput }">
            <option id="chart-type-iops" value="iops" selected>IOPS</option>
            <option id="chart-type-bandwidth" value="bandwith">Bandwidth</option>
          </select>
          <canvas id="benchmark-output-chart"></canvas>
        </div>
      </div>
    </div>

  </div>

</template>

<script setup>
import "@45drives/cockpit-css/src/index.css";
import { useSpawn } from "@45drives/cockpit-helpers";
import { ref, computed } from "vue";
import mergeDeep from "./assignObjectRecursive";
import * as XLSX from 'xlsx/xlsx.mjs';
import * as fs from 'fs';


const benchmarkTool = ref('fio');
const benchmarkType = ref('throughput');
const fileSize = ref(10);
const fileSizeUnit = ref(1024 ** 2);
const ioDepth = ref('16');
const runtime = ref('2');
const testPath = ref('/storage/fiotest');
const testSize = computed(() => fileSize.value * fileSizeUnit.value);

const progPercent = ref(0);
const downloadFormat = ref("xlsx");
const chartType = ref("iops");

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

const benchProg = ref('');
const benchStatus = ref('');
const benchPercent = ref('');
const benchOut = ref('');
const chartOut = ref('');
const results = ref({});

XLSX.set_fs(fs);

async function validateFilePath() {
  let result = true;
  testPathFeedback.value = '';
  if (!(await checkIfExists(testPath.value))) {
    result = false;
    testPathFeedback.value = 'Path does not exist';
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

//tried to merge fileSizeNum and runtimeCheck functions but had issues
// function checkNumber(input) {
//   let result = true;
//   checkNumFeedback.value = '';
//   if (isNaN(input) || input == 0) {
//     result = false;
//     checkNumFeedback.value = 'Please enter a valid numeric value';
//   }
//   numberValid.value = result;
// }

function fileSizeNum() {
  let result = true;
  fileSizeNumFeedback.value = '';
  if (isNaN(fileSize.value)) {
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
  hiddenOutput.value = true;
  hiddenProgBar.value = false;
  testCompleted.value = false;
  testInProgress.value = true;
  benchmarkFeedback.value = 'Testing...';

  const testTypes = ['write', 'read', 'randread', 'randwrite'];
  const results = {};
  let recordSizes = [];
  const fileName = 'FIO-Benchmark';

  if (benchmarkType.value == 'throughput') {
    recordSizes.push('1M');
  } else if (benchmarkType.value == 'iops') {
    recordSizes.push('4k');
  } else if (benchmarkType.value == 'spectrum') {
    recordSizes.push('4k', '8k', '16k', '32k', '64k', '128k', '512k', '1M');
  }
  progPercent.value = 0;
  for (const testType of testTypes) {
    const result = await runFioJobs({
      threadCount: 1,
      recordSizes,
      fileName,
      fileSize: testSize.value,
      testPath: testPath.value,
      ioDepth: ioDepth.value,
      runtime: runtime.value,
      testType,
    }, testTypes.length)

    mergeDeep(results, result);
  }

  console.log(results);


  benchmarkFeedback.value = 'Testing completed.';
  testInProgress.value = false;
  testCompleted.value = true;
  hiddenOutput.value = false;

  let file = fileName + '.0.0';
  await deleteFiles(file);
  return results;
}

async function runFioJobs({
  threadCount, recordSizes, fileName, fileSize, testPath, ioDepth, runtime, testType
}, totalJobs) {

  const results = {};
  for (const recordSize of recordSizes) {

    const result = await runFioJob({
      threadCount, recordSize, fileName, fileSize, testPath, ioDepth, runtime, testType
    })

    mergeDeep(results, result);
    progPercent.value += 100 / recordSizes.length / totalJobs;
  }
  return results;
}

async function runFioJob({
  threadCount, recordSize, fileName, fileSize, testPath, ioDepth, runtime, testType
}) {
  try {
    let args = [benchmarkTool.value, '--directory', testPath, '--name', fileName, '--rw', testType, '-bs', recordSize, '--size', fileSize, '--numjobs', threadCount, '--time_based', '--ramp_time', '5', '--runtime', runtime, '--iodepth', ioDepth, '--group_reporting', '--output-format=json'];

    const proc = await useSpawn(args, { superuser: 'try' }).promise();
    const output = JSON.parse(proc.stdout);

    const [job] = output.jobs;

    switch (testType) {
      case 'write':
        const writeBW = ((job.write.bw / 976.6) / runtime).toFixed(2);
        return {
          name: job.jobname,
          tool: benchmarkTool.value,
          type: benchmarkType.value,
          recSize: recordSize,
          iops: {
            write: { [recordSize]: (job.write.iops.toFixed(2)) }
          },
          bandwidth: {
            write: { [recordSize]: `${writeBW} MB/S` }
          },
        }
      case 'read':
        const readBW = (((job.read.bw / 976.6) / runtime).toFixed(2));
        return {
          iops: {
            read: { [recordSize]: (job.read.iops.toFixed(2)) }
          },
          bandwidth: {
            read: { [recordSize]: `${readBW} MB/S` }
          },
        }
      case 'randread':
        const randReadBW = (((job.read.bw / 976.6) / runtime).toFixed(2));
        return {
          iops: {
            randread: { [recordSize]: (job.read.iops.toFixed(2)) }
          },
          bandwidth: {
            randread: { [recordSize]: `${randReadBW} MB/S` }
          },
        }
      case 'randwrite':
        const randWriteBW = ((job.write.bw / 976.6) / runtime).toFixed(2);
        return {
          iops: {
            randwrite: { [recordSize]: (job.write.iops.toFixed(2)) }
          },
          bandwidth: {
            randwrite: { [recordSize]: `${randWriteBW} MB/S` }
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
    await useSpawn(['sh', '-c', `rm -f ${testPath.value}/${file}`]).promise();
  } catch (error) {
    console.error(error);
  }
}

function genSheet(data) {
  if (data === null) return;

  const date = data.date ?? new Date();

  const aoa = [
    [
      'Tool',
      data.type !== null ? 'Test Type' : null,
      'Record Size',
      'Date',
      ...(data.bandwidth ? ['Reads (MB/s)',
        'Writes (MB/s)',
        'Random Reads (MB/s)',
        'Random Writes (MB/s)'] : []),
      ...(data.iops ? [`Reads (IOPS)`,
        `Writes (IOPS)`,
        `Random Reads (IOPS)`,
        `Random Writes (IOPS)`] : []),
    ].filter(x => x !== null),
    ...data.data.map(x => [
      data.tool,
      data.type ?? null,
      data.recSize,
      date.toLocaleString(),
      x.bandwidth?.write,
      x.bandwidth?.read,
      x.bandwidth?.randread,
      x.bandwidth?.randwrite,
      x.iops?.write,
      x.iops?.read,
      x.iops?.randread,
      x.iops?.randwrite,
    ].filter(x => (x ?? null) !== null)),
  ];
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(aoa)

  XLSX.utils.book_append_sheet(wb, ws, 'Benchmarks');

  const dateFormatted = `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`;
  const timeFormatted = `${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}${String(date.getSeconds()).padStart(2, '0')}-${date.getTime()}`;

  XLSX.writeFile(wb,
    `benchmark-${data.tool}-${data.type}-${dateFormatted}-${timeFormatted}.${downloadFormat.value}`
  );
}


//Export to chart -> XLSX/CSV/ODS

//Download Chart

</script>

<style>
</style>