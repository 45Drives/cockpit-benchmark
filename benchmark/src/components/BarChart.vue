<template>
  <div>
    <canvas id="myChart" width=".25" height=".25"></canvas>
  </div>
</template>

<script>
import Chart from 'chart.js/auto';


export default {
  name: 'BarChart',
  props: {
    chartData: String,
  },
  charting(chartData, label) {
    const ctx = document.getElementById('myChart');

    const myChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: [label],
        // 1M or 1k or
        // '4k', '8k', '16k', '32k', '64k', '128k', '512k', '1M'
        datasets: [
          {
            label: "Reads (IOPS)",
            data: [],
            backgroundColor: ['#4DC9F6'],
            borderColor: ['#4DC9F6'],
            borderWidth: 1
          },
          {
            label: "Writes (IOPS)",
            data: [],
            backgroundColor: ['#0A88C7'],
            borderColor: ['#0A88C7'],
            borderWidth: 1
          },
          {
            label: "Random Reads (IOPS)",
            data: [],
            backgroundColor: ['#0E68C5'],
            borderColor: ['#0E68C5'],
            borderWidth: 1
          },
          {
            label: "Random Writes (IOPS)",
            data: [],
            backgroundColor: ['#0D45C1'],
            borderColor: ['#0D45C1'],
            borderWidth: 1
          },

          {
            label: "Reads (MB/s)",
            data: [],
            backgroundColor: ['#4DC9F6'],
            borderColor: ['#4DC9F6'],
            borderWidth: 1
          },
          {
            label: "Writes (MB/s)",
            data: [],
            backgroundColor: ['#0A88C7'],
            borderColor: ['#0A88C7'],
            borderWidth: 1
          },
          {
            label: "Random Reads (MB/s)",
            data: [],
            backgroundColor: ['#0E68C5'],
            borderColor: ['#0E68C5'],
            borderWidth: 1
          },
          {
            label: "Random Writes (MB/s)",
            data: [],
            backgroundColor: ['#0D45C1'],
            borderColor: ['#0D45C1'],
            borderWidth: 1
          },
        ]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true
          }
        },
        plugins: {
          legend: {
            position: 'top'
          },
          title: {
            display: true,
            text: 'Benchmark Data'
          }
        }
      }
    });

    myChart;
  }
}


</script>
