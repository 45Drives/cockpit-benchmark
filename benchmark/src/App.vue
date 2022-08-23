<template>
  <!--Benchmark Criteria Form-->
  <div id="benchmarkForm" class="centered-column w-full gap-content flex flex-col items-stretch text-left">
    <label class="text-header">Benchmarks</label>

    <!--Error Alerts-->

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
        <input id="fileSize" v-model="fileSize" type="text" class="pr-12 input-textlike w-full sm:w-auto" />
        <div class="absolute inset-y-0 right-0 flex items-center">
          <label class="sr-only">Unit</label>
          <select id="fileSizeUnit" v-model="fileSizeUnit" class="input-textlike border-transparent bg-transparent">
            <option :value="1024 ** 2">MiB</option>
            <option :value="1024 ** 3">GiB</option>
          </select>
        </div>
      </div>
    </div>

    <!-- <div>FileSizeTest={{ testSize }}</div> -->

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
      <input id="runtime" v-model="runtime" type="number" class="input-textlike" default="2" />

    </div>

    <div id="6">
      <label class="text-label mr-2">Test Path</label>
      <input @change="validateInputs()" id="testPath" v-model="testPath" type="text" class="input-textlike"
        placeholder="/mnt/hdd" />
      <p v-if="testPathFeedback">{{ testPathFeedback }}</p>
    </div>

    <div>
      <button id="launchBenchmarkBtn" class="btn btn-primary mt-2 mr-2" @click="button()"
        :disabled="!inputsValid">Launch</button>
      <button id="downloadBenchmarkBtn" class="btn btn-primary mt-2 ml-2" disabled>Download Report</button>
      <!-- <div id="spinner"
        class="aspect-square animate-spin border-neutral-300 border-t-neutral-500 dark:border-neutral-500 dark:border-t-neutral-200 rounded-full hidden" /> -->

      <div id="benchmarkProgress" class="progress-container progress-description-left mt-4 hidden">
        <div class="progress-description">
          <div class="bg-gray-200 rounded-full overflow-hidden">
            <div class="h-2 bg-green-600 rounded-full" :style="{ width: `${progPercent}%` }"></div>
          </div>
        </div>
      </div>
      <div id="benchmarkOutput" class="benchmark-output mt-6 text-center hidden float-left">
        <label class="text-label mr-2">Download Format</label>
        <select id="downloadFormat" v-model="downloadFormat" class="input-textlike bg-transparent">
          <option value="xlsx">XLSX</option>
          <option value="csv">CSV</option>
          <option value="ods">ODS</option>
        </select>
        <div id="output" class="hidden float-right">
          <label class="text-label mr-2">Output</label>
          <select id="chartType" v-model="chartType" class="switcher input-textlike bg-transparent hidden">
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

//Input ->  Tool, Type, Size + Unit, IODepth, Runtime, Path
const benchmarkTool = ref('fio');
const benchmarkType = ref('throughput');
const fileSize = ref(1);
const fileSizeUnit = ref(1024 ** 3);
const ioDepth = ref('16');
const runtime = ref('2');
const testPath = ref('');

const testSize = computed(() => fileSize.value * fileSizeUnit.value);
const progPercent = ref(0);
const downloadFormat = ref("xlsx");
const chartType = ref("iops");
const inputsValid = ref(true);
const testPathFeedback = ref('');

async function validateInputs() {
  let result = true;
  testPathFeedback.value = '';
  if (!(await checkIfExists(testPath.value))) {
    result = false;
    testPathFeedback.value = 'Path does not exist';
  }
  inputsValid.value = result;
}

//LaunchBTN -> @click -> launchFunction -> Validate fields (fileSize, runtime, testPath)

//showing output and progress bars for debugging
function button() {
  let benchOut = document.getElementById("benchmarkOutput");
  let benchProg = document.getElementById("benchmarkProgress");
  // let spin = document.getElementById("spinner");
  let out = document.getElementById("output");
  let chart = document.getElementById("chartType");

  benchOut.classList.remove('hidden');
  benchProg.classList.remove('hidden');
  // spin.classList.remove('hidden');
  out.classList.remove('hidden');
  chart.classList.remove('hidden');


  launchTests();
}


const checkIfExists = async (path) => {
  try {
    await useSpawn(['test', '-d', path], { superuser: 'try' }).promise();
    return true;

  } catch (error) {
    return false;
  }
};


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
        return {
          iops: {
            write: { [recordSize]: job.write.iops }
          },
          bandwidth: {
            write: { [recordSize]: job.write.bw }
          },
        }
      case 'read':
        return {
          iops: {
            read: { [recordSize]: job.read.iops }
          },
          bandwidth: {
            read: { [recordSize]: job.read.bw }
          },
        }
      case 'randread':
        return {
          iops: {
            randread: { [recordSize]: job.read.iops }
          },
          bandwidth: {
            randread: { [recordSize]: job.read.bw }
          },
        }
      case 'randwrite':
        return {
          iops: {
            randwrite: { [recordSize]: job.write.iops }
          },
          bandwidth: {
            randwrite: { [recordSize]: job.write.bw }
          },
        }
    }
    return {
    }
  } catch (error) {
    console.error(error);
  }

}

async function launchTests() {
  const testTypes = ['write', 'read', 'randread', 'randwrite'];
  const results = {};
  let recordSizes = [];
  if (benchmarkType.value == 'throughput') {
    recordSizes.push('1M');
  }
  else if (benchmarkType.value == 'iops') {
    recordSizes.push('4k');
  } else if (benchmarkType.value == 'spectrum') {
    recordSizes.push('4k', '8k', '16k', '32k', '64k', '128k', '512k', '1M');
  }
  progPercent.value = 0;
  for (const testType of testTypes) {
    const result = await runFioJobs({
      threadCount: 1,
      recordSizes,
      fileName: 'fiotest',
      fileSize: testSize.value,
      testPath: testPath.value,
      ioDepth: ioDepth.value,
      runtime: runtime.value,
      testType,
    }, testTypes.length)

    mergeDeep(results, result);
  }
  console.log(results);
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


//Export to chart -> XLSX/CSV/ODS



//Download Chart



</script>

<style>
</style>