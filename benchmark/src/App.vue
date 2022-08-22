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
            <option :value="1">B</option>
            <option :value="1024 ** 1">KiB</option>
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
      <input id="testPath" v-model="testPath" type="text" class="input-textlike" placeholder="/mnt/hdd" />

    </div>

    <div>
      <button id="launchBenchmarkBtn" class="btn btn-primary mt-2 mr-2" @click="button()">Launch</button>
      <button id="downloadBenchmarkBtn" class="btn btn-primary mt-2 ml-2" disabled>Download Report</button>
      <!-- <div id="spinner"
        class="aspect-square animate-spin border-neutral-300 border-t-neutral-500 dark:border-neutral-500 dark:border-t-neutral-200 rounded-full hidden" /> -->
      <div id="benchmarkProgress" class="progress-container progress-description-left mt-4 hidden">
        <div class="progress-description">
          <div id="progressBar" class="w-full mt-5 bg-gray-200 rounded-full dark:bg-gray-700 h-10">
            <div id="progressActive" role="progressbar"
              class="bg-primary text-m font-medium text-white-100 text-center p-0.5 leading-none rounded-full h-10"
              aria-valuenow="0" aria-valuemin="0" aria-valuemax="100" style="width: 0%"> {{ percent }}</div>
            <span class="sr-only"></span>
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
            <option name="chart-type" id="chart-type-iops" value="iops" selected>IOPS</option>
            <option name="chart-type" id="chart-type-bandwidth" value="bandwith">Bandwidth</option>
          </select>
          <canvas id="benchmark-output-chart"></canvas>
        </div>
      </div>
    </div>

  </div>

</template>

<script setup>
import "@45drives/cockpit-css/src/index.css";
import { useSpawn } from '@45drives/cockpit-helpers';
import { ref, computed } from "vue";



//Input ->  Tool, Type, Size + Unit, IODepth, Runtime, Path
const benchmarkTool = ref('fio');
const benchmarkType = ref('throughput');
const fileSize = ref();
const fileSizeUnit = ref(1);
const ioDepth = ref('16');
const runtime = ref('2');
const testPath = ref('');

const testSize = computed(() => fileSize.value * fileSizeUnit.value);
const percent = ref('');
const downloadFormat = ref("xlsx");
const chartType = ref("iops");



//LaunchBTN -> @click -> launchFunction -> Validate fields (fileSize, runtime, testPath)

const pathExists = ref(false);

const checkIfExists = async () => {
  try {
    await useSpawn(['stat', testPath], { superuser: 'try' }).promise();
    pathExists.value = true;
    console.log('path exists');
    console.log(testPath);

  } catch {
    pathExists.value = false;
    console.log('path no exist');
    console.log(testPath);
  }
};


function button() {
  //showing output and progress bars for debugging

  let benchOut = document.getElementById("benchmarkOutput");
  let benchProg = document.getElementById("benchmarkProgress");
  let progBar = document.getElementById("progressBar");
  // let spin = document.getElementById("spinner");
  let out = document.getElementById("output");
  let chart = document.getElementById("chartType");

  benchOut.classList.remove('hidden');
  benchProg.classList.remove('hidden');
  progBar.classList.remove('hidden');
  // spin.classList.remove('hidden');
  out.classList.remove('hidden');
  chart.classList.remove('hidden');

  //checking file path
  checkIfExists();
}


//FIO Command ->
// ['benchmarkType', '--directory', testPath, '--name', fileName, '--rw', typeLut[idx], '-bs', recordSize, '--size', fileSize.join(''), '--numjobs', threadCount, '--time_based', '--ramp_time', '5', '--runtime', runtime, '--iodepth', ioDepth, '--group_reporting', '--output-format=json'].filter(x => x !== null);




//Run Job(s) -> ProgressBar Responds (using ref)



//JSON Output -> Save to directory



//Parse JSON file -> Tool, Type, RecordSize, Date, Reads(mb/s), Writes(mb/s), RandReads(mb/s), RandWrites(mb/s)
//                                                 Reads(IOPS), Writes(IOPS), RandReads(IOPS), RandWrites(IOPS)



//Export to chart -> XLSX/CSV/ODS



//Download Chart



</script>

<style>
</style>