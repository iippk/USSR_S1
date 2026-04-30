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

const processRevenueData = () => {
  const last7Days = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];
    const dayOrders = props.orders.filter((order) => {
      if (
        !order.createdAt ||
        (order.status !== "paid" && order.status !== "completed")
      )
        return false;
      return new Date(order.createdAt).toISOString().split("T")[0] === dateStr;
    });
    last7Days.push({
      date: `${date.getMonth() + 1}/${date.getDate()}`,
      revenue: dayOrders
        .reduce((sum, o) => sum + (o.totalPrice || 0), 0)
        .toFixed(2),
    });
  }
  return last7Days;
};

const initChart = () => {
  if (!chartRef.value) return;
  if (chartInstance) chartInstance.dispose();
  chartInstance = echarts.init(chartRef.value);

  const data = processRevenueData();

  const option = {
    title: {
      text: "近7天收入统计",
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
      axisPointer: { type: "shadow" },
      backgroundColor: "#fff",
      borderColor: "#E0E7F0",
      borderWidth: 1,
      textStyle: { color: "#333", fontSize: 13 },
      extraCssText:
        "box-shadow: 0 4px 12px rgba(74,144,226,0.08); border-radius: 8px;",
      formatter: function (params) {
        return `<div style="font-weight:600;margin-bottom:4px;">${params[0].name}</div><div>收入：¥${params[0].data}</div>`;
      },
    },
    grid: {
      left: "3%",
      right: "4%",
      bottom: "3%",
      containLabel: true,
      top: 72,
    },
    xAxis: {
      type: "category",
      data: data.map((d) => d.date),
      axisLine: { lineStyle: { color: "#EAEFF5" } },
      axisTick: { show: false },
      axisLabel: { color: "#999", fontSize: 12 },
    },
    yAxis: {
      type: "value",
      name: "收入 (¥)",
      nameTextStyle: { color: "#999", fontSize: 12, padding: [0, 30, 0, 0] },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: "#F0F6FF", type: "dashed" } },
      axisLabel: { color: "#999", fontSize: 12, formatter: "¥{value}" },
    },
    series: [
      {
        name: "收入",
        type: "bar",
        barWidth: "45%",
        data: data.map((d) => d.revenue),
        itemStyle: {
          borderRadius: [6, 6, 0, 0],
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: "#4A90E2" },
            { offset: 1, color: "#66B2FF" },
          ]),
        },
        emphasis: {
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: "#3A7CD0" },
              { offset: 1, color: "#4A90E2" },
            ]),
          },
        },
        animationDelay: function (idx) {
          return idx * 80;
        },
      },
    ],
    animationEasing: "cubicOut",
    animationDuration: 800,
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
