<template>
  <div class="chart-wrapper">
    <div ref="chartRef" class="chart-container"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from "vue";
import * as echarts from "echarts";

const props = defineProps({
  data: {
    type: Object,
    default: () => ({}),
  },
});

const chartRef = ref(null);
let chartInstance = null;

const initChart = () => {
  if (!chartRef.value) return;

  if (chartInstance) chartInstance.dispose();
  chartInstance = echarts.init(chartRef.value);

  const option = {
    title: {
      text: "座位使用情况",
      left: "center",
      top: 16,
      textStyle: {
        fontSize: 15,
        fontWeight: "600",
        color: "#333",
        fontFamily: "PingFang SC, Inter, sans-serif",
      },
    },
    tooltip: {
      trigger: "item",
      formatter: "{a} <br/>{b}: {c} ({d}%)",
      backgroundColor: "#fff",
      borderColor: "#E0E7F0",
      borderWidth: 1,
      textStyle: { color: "#333", fontSize: 13 },
      extraCssText:
        "box-shadow: 0 4px 12px rgba(74,144,226,0.08); border-radius: 8px;",
    },
    legend: {
      orient: "vertical",
      left: 16,
      top: "middle",
      textStyle: { fontSize: 13, color: "#666" },
      itemWidth: 12,
      itemHeight: 12,
      itemGap: 16,
    },
    series: [
      {
        name: "座位状态",
        type: "pie",
        radius: ["42%", "68%"],
        center: ["58%", "52%"],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 8,
          borderColor: "#fff",
          borderWidth: 3,
        },
        label: { show: false },
        emphasis: {
          label: {
            show: true,
            fontSize: 16,
            fontWeight: "600",
            color: "#333",
          },
        },
        labelLine: { show: false },
        data: [
          {
            value: props.data.inUseSeats || 0,
            name: "使用中",
            itemStyle: { color: "#4A90E2" },
          },
          {
            value: props.data.freeSeats || 0,
            name: "空闲",
            itemStyle: { color: "#50C878" },
          },
        ],
      },
    ],
    animationType: "scale",
    animationEasing: "cubicOut",
  };

  chartInstance.setOption(option);
};

onMounted(() => {
  initChart();
  window.addEventListener("resize", () => chartInstance?.resize());
});

watch(
  () => props.data,
  () => initChart(),
  { deep: true }
);
</script>

<style scoped>
.chart-wrapper {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: 20px;
  box-shadow: var(--shadow-card);
}
.chart-container {
  width: 100%;
  height: 340px;
}
</style>
