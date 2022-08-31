<template>
  <div>
    <canvas id="myChart" height="300"></canvas>
  </div>
</template>

<script>
import Chart from 'chart.js/auto';
import { ref, onMounted } from 'vue';

export default {
  name: 'BarChart',
  props: {
    chartData: Array,
    dataType: String,
    labels: Array
  },
  setup({ chartData, dataType, labels }) {
    const chart = ref();

    onMounted(() => {
      const ctx = document.getElementById('myChart');

      const options = {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: "Reads",
              data: chartData.map(result =>
                Number(result[dataType].read)),
              backgroundColor: ['#94a3b8'],
              borderColor: ['#94a3b8'],
              borderWidth: 1
            },
            {
              label: "Writes",
              data: chartData.map(result =>
                Number(result[dataType].write)),
              backgroundColor: ['#64748b'],
              borderColor: ['#64748b'],
              borderWidth: 1
            },
            {
              label: "Random Reads",
              data: chartData.map(result =>
                Number(result[dataType].randread)),
              backgroundColor: ['#475569'],
              borderColor: ['#475569'],
              borderWidth: 1
            },
            {
              label: "Random Writes",
              data: chartData.map(result =>
                Number(result[dataType].randwrite)),
              backgroundColor: ['#334155'],
              borderColor: ['#334155'],
              borderWidth: 1
            },
          ]
        },
        options: {
          maintainAspectRatio: false,
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
              text: `Benchmark Data (${dataType.toUpperCase()})`
            }
          }
        }
      }
      chart.value = new Chart(ctx, options);

    })
    return { chart }
  }
}

</script>
