<template>
  <div class="chart-wrapper">
    <div ref="chartRef" class="chart-container"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from "vue";
import * as echarts from "echarts";

const props = defineProps({
  orders: { type: Array, default: () => [] },
});

const chartRef = ref(null);
let chartInstance = null;

const processOrderData = () => {
  const last7Days = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];
    const dayOrders = props.orders.filter((order) => {
      if (!order.createdAt) return false;
      return new Date(order.createdAt).toISOString().split("T")[0] === dateStr;
    });
    last7Days.push({
      date: `${date.getMonth() + 1}/${date.getDate()}`,
      total: dayOrders.length,
      completed: dayOrders.filter((o) => o.status === "completed").length,
      cancelled: dayOrders.filter((o) => o.status === "cancelled").length,
    });
  }
  return last7Days;
};

const initChart = () => {
  if (!chartRef.value) return;
  if (chartInstance) chartInstance.dispose();
  chartInstance = echarts.init(chartRef.value);

  const data = processOrderData();

  const option = {
    title: {
      text: "近7天订单趋势",
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
      trigger: "axis",
      backgroundColor: "#fff",
      borderColor: "#E0E7F0",
      borderWidth: 1,
      textStyle: { color: "#333", fontSize: 13 },
      extraCssText:
        "box-shadow: 0 4px 12px rgba(74,144,226,0.08); border-radius: 8px;",
    },
    legend: {
      data: ["总订单", "已完成", "已取消"],
      top: 42,
      textStyle: { fontSize: 12, color: "#666" },
      itemWidth: 16,
      itemHeight: 3,
    },
    grid: {
      left: "3%",
      right: "4%",
      bottom: "3%",
      containLabel: true,
      top: 80,
    },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: data.map((d) => d.date),
      axisLine: { lineStyle: { color: "#EAEFF5" } },
      axisTick: { show: false },
      axisLabel: { color: "#999", fontSize: 12 },
    },
    yAxis: {
      type: "value",
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: "#F0F6FF", type: "dashed" } },
      axisLabel: { color: "#999", fontSize: 12 },
    },
    series: [
      {
        name: "总订单",
        type: "line",
        smooth: true,
        symbol: "circle",
        symbolSize: 6,
        data: data.map((d) => d.total),
        lineStyle: { width: 2.5, color: "#4A90E2" },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: "rgba(74, 144, 226, 0.15)" },
            { offset: 1, color: "rgba(74, 144, 226, 0.02)" },
          ]),
        },
        itemStyle: { color: "#4A90E2" },
      },
      {
        name: "已完成",
        type: "line",
        smooth: true,
        symbol: "circle",
        symbolSize: 6,
        data: data.map((d) => d.completed),
        lineStyle: { width: 2.5, color: "#50C878" },
        itemStyle: { color: "#50C878" },
      },
      {
        name: "已取消",
        type: "line",
        smooth: true,
        symbol: "circle",
        symbolSize: 6,
        data: data.map((d) => d.cancelled),
        lineStyle: { width: 2.5, color: "#FF6B6B" },
        itemStyle: { color: "#FF6B6B" },
      },
    ],
    animationDuration: 800,
    animationEasing: "cubicOut",
  };

  chartInstance.setOption(option);
};

onMounted(() => {
  initChart();
  window.addEventListener("resize", () => chartInstance?.resize());
});

watch(
  () => props.orders,
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
