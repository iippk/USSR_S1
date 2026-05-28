<template>
  <div class="data-screen">
    <div class="screen-header">
      <dv-decoration-8 class="header-left" />
      <div class="header-center">
        <dv-decoration-5 :dur="2" class="header-title-deco" />
        <h1 class="screen-title">🏫 自习室数据驾驶舱</h1>
      </div>
      <dv-decoration-8 :reverse="true" class="header-right" />
      <div class="header-time">{{ currentTime }}</div>
    </div>

    <div class="screen-body">
      <div class="panel-left">
        <div class="panel-box" style="height: 180px">
          <div class="panel-title">📊 今日概览</div>
          <div class="kpi-grid">
            <div class="kpi-card">
              <dv-digital-flop
                :config="kpiConfig(todayOrderCount)"
                class="kpi-num"
              />
              <span class="kpi-label">今日订单</span>
            </div>
            <div class="kpi-card">
              <dv-digital-flop
                :config="kpiConfig(todayRevenue, '¥')"
                class="kpi-num"
              />
              <span class="kpi-label">今日营收</span>
            </div>
            <div class="kpi-card">
              <dv-digital-flop
                :config="kpiConfig(todayNewUsers)"
                class="kpi-num"
              />
              <span class="kpi-label">新增用户</span>
            </div>
            <div class="kpi-card">
              <dv-digital-flop
                :config="kpiConfig(usingSeats)"
                class="kpi-num"
              />
              <span class="kpi-label">在学人数</span>
            </div>
          </div>
        </div>

        <div class="panel-box" style="flex: 1">
          <div class="panel-title-row">
            <div class="panel-title">📈 营收趋势</div>
            <div class="range-btns">
              <span class="range-btn" :class="{ active: trendRange === 'week' }" @click="switchTrendRange('week')">近7天</span>
              <span class="range-btn" :class="{ active: trendRange === 'month' }" @click="switchTrendRange('month')">近4周</span>
              <span class="range-btn" :class="{ active: trendRange === 'year' }" @click="switchTrendRange('year')">近1年</span>
            </div>
          </div>
          <div style="flex: 1; min-height: 0">
            <v-chart
              :option="revenueTrendOption"
              style="width: 100%; height: 100%"
            />
          </div>
        </div>

        <div class="panel-box" style="height: 170px">
          <div class="panel-title">🎫 优惠券使用率</div>
          <div style="display: flex; align-items: center; gap: 16px; flex: 1">
            <div style="width: 100px; height: 100px; flex-shrink: 0">
              <v-chart
                :option="couponOption"
                style="width: 100%; height: 100%"
              />
            </div>
            <div class="coupon-info">
              <div class="ci-row">
                <span class="ci-label">已发放</span
                ><span class="ci-val">{{ totalCoupons }}</span>
              </div>
              <div class="ci-row">
                <span class="ci-label">已使用</span
                ><span class="ci-val">{{ usedCoupons }}</span>
              </div>
              <div class="ci-row">
                <span class="ci-label">使用率</span
                ><span class="ci-val text-cyan">{{ couponUsageRate }}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="panel-center">
        <div class="panel-box" style="flex: 1.1">
          <div class="panel-title">🔵 座位实时状态</div>
          <div
            style="
              display: flex;
              align-items: center;
              gap: 24px;
              flex: 1;
              min-height: 0;
            "
          >
            <div style="flex: 1; height: 100%; min-height: 0">
              <v-chart
                :option="seatPieOption"
                style="width: 100%; height: 100%"
              />
            </div>
            <div class="seat-legend">
              <div class="sl-item">
                <span class="sl-dot" style="background: #10b981"></span>
                <span class="sl-label">空闲</span>
                <span class="sl-val text-success">{{ availableSeats }}</span>
              </div>
              <div class="sl-item">
                <span class="sl-dot" style="background: #f5a623"></span>
                <span class="sl-label">使用中</span>
                <span class="sl-val text-warning">{{ usingSeats }}</span>
              </div>
              <div class="sl-item">
                <span class="sl-dot" style="background: #ef4444"></span>
                <span class="sl-label">维护</span>
                <span class="sl-val text-danger">{{ fixSeats }}</span>
              </div>
              <div class="sl-divider"></div>
              <div class="sl-item">
                <span class="sl-dot" style="background: #00e4ff"></span>
                <span class="sl-label">使用率</span>
                <span class="sl-val text-cyan" style="font-size: 24px"
                  >{{ usageRate }}%</span
                >
              </div>
            </div>
          </div>
        </div>

        <div class="panel-box" style="flex: 0.9">
          <div class="panel-title">🏢 分区使用情况</div>
          <div style="flex: 1; min-height: 0">
            <v-chart
              :option="zoneBarOption"
              style="width: 100%; height: 100%"
            />
          </div>
        </div>
      </div>

      <div class="panel-right">
        <div class="panel-box" style="flex: 1">
          <div class="panel-title">🥧 套餐类型占比</div>
          <div style="flex: 1; min-height: 0">
            <v-chart
              :option="planTypeOption"
              style="width: 100%; height: 100%"
            />
          </div>
        </div>

        <div class="panel-box" style="flex: 1">
          <div class="panel-title-row">
            <div class="panel-title">📉 订单趋势</div>
            <div class="range-btns">
              <span class="range-btn" :class="{ active: trendRange === 'week' }" @click="switchTrendRange('week')">近7天</span>
              <span class="range-btn" :class="{ active: trendRange === 'month' }" @click="switchTrendRange('month')">近30天</span>
              <span class="range-btn" :class="{ active: trendRange === 'year' }" @click="switchTrendRange('year')">近1年</span>
            </div>
          </div>
          <div style="flex: 1; min-height: 0">
            <v-chart
              :option="orderTrendOption"
              style="width: 100%; height: 100%"
            />
          </div>
        </div>

        <div class="panel-box" style="height: 170px">
          <div class="panel-title">📋 累计统计</div>
          <div class="total-stats">
            <div class="total-row">
              <span class="total-label">累计用户</span>
              <dv-digital-flop
                :config="kpiConfig(totalUsers)"
                class="total-num"
              />
            </div>
            <div class="total-row">
              <span class="total-label">累计订单</span>
              <dv-digital-flop
                :config="kpiConfig(totalOrderCount)"
                class="total-num"
              />
            </div>
            <div class="total-row">
              <span class="total-label">累计营收</span>
              <dv-digital-flop
                :config="kpiConfig(totalRevenue, '¥')"
                class="total-num"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from "vue";
import VChart from "vue-echarts";
import { use } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import { PieChart, LineChart, BarChart } from "echarts/charts";
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
} from "echarts/components";
import {
  callCloudFunction,
  ensureCloudReady,
} from "../utils/cloudBase.js";

use([
  CanvasRenderer,
  PieChart,
  LineChart,
  BarChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
]);

var currentTime = ref("");
var timer = null;

var todayOrderCount = ref(0);
var todayRevenue = ref(0);
var todayNewUsers = ref(0);
var usingSeats = ref(0);
var totalSeats = ref(0);
var availableSeats = ref(0);
var fixSeats = ref(0);
var usageRate = ref(0);
var zoneUsing = ref({ immersive: 0, sunshine: 0, vip: 0 });
var totalUsers = ref(0);
var totalOrderCount = ref(0);
var totalRevenue = ref(0);
var weekRevenueData = ref([0, 0, 0, 0, 0, 0, 0]);
var weekOrderData = ref([0, 0, 0, 0, 0, 0, 0]);
var planTypeCount = ref({ hour: 0, day: 0, week: 0 });
var totalCoupons = ref(0)
var usedCoupons = ref(0)
var couponUsageRate = ref(0)
var trendRange = ref('week')
var trendLabels = ref([])
var trendRevenueData = ref([])
var trendOrderData = ref([]);

function kpiConfig(num, prefix) {
  return {
    number: [num],
    content: prefix ? prefix + "{nt}" : "{nt}",
    toFixed: 0,
    textAlign: "center",
    style: { fontSize: 26, fill: "#00e4ff" },
  };
}

function getWeekLabels() {
  var labels = [];
  var now = new Date();
  for (var i = 6; i >= 0; i--) {
    var d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    labels.push(d.getMonth() + 1 + "/" + d.getDate());
  }
  return labels;
}

var seatPieOption = computed(function () {
  return {
    tooltip: {
      trigger: "item",
      backgroundColor: "rgba(0,0,0,0.7)",
      textStyle: { color: "#fff" },
    },
    series: [
      {
        type: "pie",
        radius: ["50%", "75%"],
        center: ["50%", "50%"],
        label: { show: false },
        emphasis: {
          label: { show: true, fontSize: 14, color: "#fff" },
          itemStyle: { shadowBlur: 10, shadowColor: "rgba(0,228,255,0.4)" },
        },
        data: [
          {
            value: availableSeats.value,
            name: "空闲",
            itemStyle: { color: "#10b981" },
          },
          {
            value: usingSeats.value,
            name: "使用中",
            itemStyle: { color: "#f5a623" },
          },
          {
            value: fixSeats.value,
            name: "维护",
            itemStyle: { color: "#ef4444" },
          },
        ],
        animationType: "scale",
        animationEasing: "elasticOut",
      },
    ],
  };
});

var revenueTrendOption = computed(function () {
  return {
    tooltip: { trigger: "axis", backgroundColor: "rgba(0,0,0,0.7)", borderColor: "#00e4ff", textStyle: { color: "#fff" } },
    grid: { left: 45, right: 15, top: 15, bottom: 25 },
    xAxis: { type: "category", data: trendLabels.value, axisLine: { lineStyle: { color: "#1a5276" } }, axisLabel: { color: "#7fb3d3", fontSize: 10, rotate: trendRange.value === 'year' ? 45 : trendRange.value === 'month' ? 15 : 0 } },
    yAxis: { type: "value", splitLine: { lineStyle: { color: "#0d2b45" } }, axisLabel: { color: "#7fb3d3", fontSize: 10 } },
    series: [{ data: trendRevenueData.value, type: "line", smooth: true, lineStyle: { color: "#00e4ff", width: 2 }, areaStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "rgba(0,228,255,0.35)" }, { offset: 1, color: "rgba(0,228,255,0.02)" }] } }, itemStyle: { color: "#00e4ff" }, symbol: "circle", symbolSize: 4 }],
  };
});

var orderTrendOption = computed(function () {
  return {
    tooltip: { trigger: "axis", backgroundColor: "rgba(0,0,0,0.7)", borderColor: "#00e4ff", textStyle: { color: "#fff" } },
    grid: { left: 35, right: 15, top: 15, bottom: 25 },
    xAxis: { type: "category", data: trendLabels.value, axisLine: { lineStyle: { color: "#1a5276" } }, axisLabel: { color: "#7fb3d3", fontSize: 10, rotate: trendRange.value === 'year' ? 45 : trendRange.value === 'month' ? 15 : 0 } },
    yAxis: { type: "value", splitLine: { lineStyle: { color: "#0d2b45" } }, axisLabel: { color: "#7fb3d3", fontSize: 10 } },
    series: [{ data: trendOrderData.value, type: "bar", itemStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "#00e4ff" }, { offset: 1, color: "#005f73" }] }, borderRadius: [4, 4, 0, 0] }, barWidth: trendRange.value === 'year' ? 8 : trendRange.value === 'month' ? 28 : 16 }],
  };
});

var planTypeOption = computed(function () {
  var data = [
    {
      value: planTypeCount.value.hour,
      name: "小时套餐",
      itemStyle: { color: "#00e4ff" },
    },
    {
      value: planTypeCount.value.day,
      name: "天卡套餐",
      itemStyle: { color: "#f5a623" },
    },
    {
      value: planTypeCount.value.week,
      name: "周卡套餐",
      itemStyle: { color: "#7c3aed" },
    },
  ];
  return {
    tooltip: {
      trigger: "item",
      backgroundColor: "rgba(0,0,0,0.7)",
      textStyle: { color: "#fff" },
    },
    legend: { bottom: 5, textStyle: { color: "#7fb3d3", fontSize: 11 } },
    series: [
      {
        type: "pie",
        radius: ["40%", "65%"],
        center: ["50%", "45%"],
        label: { color: "#7fb3d3", fontSize: 11 },
        data: data,
        emphasis: {
          itemStyle: { shadowBlur: 10, shadowColor: "rgba(0,228,255,0.5)" },
        },
      },
    ],
  };
});

var zoneBarOption = computed(function () {
  return {
    tooltip: {
      trigger: "axis",
      backgroundColor: "rgba(0,0,0,0.7)",
      textStyle: { color: "#fff" },
    },
    grid: { left: 80, right: 50, top: 15, bottom: 20 },
    xAxis: {
      type: "value",
      splitLine: { lineStyle: { color: "#0d2b45" } },
      axisLabel: { color: "#7fb3d3" },
    },
    yAxis: {
      type: "category",
      data: ["VIP区 👑", "阳光区 ☀️", "沉浸区 🤫"],
      axisLine: { lineStyle: { color: "#1a5276" } },
      axisLabel: { color: "#7fb3d3", fontSize: 12 },
    },
    series: [
      {
        type: "bar",
        data: [
          {
            value: zoneUsing.value.vip,
            itemStyle: {
              color: {
                type: "linear",
                x: 0,
                y: 0,
                x2: 1,
                y2: 0,
                colorStops: [
                  { offset: 0, color: "#7c3aed" },
                  { offset: 1, color: "#a78bfa" },
                ],
              },
            },
          },
          {
            value: zoneUsing.value.sunshine,
            itemStyle: {
              color: {
                type: "linear",
                x: 0,
                y: 0,
                x2: 1,
                y2: 0,
                colorStops: [
                  { offset: 0, color: "#f5a623" },
                  { offset: 1, color: "#fbbf24" },
                ],
              },
            },
          },
          {
            value: zoneUsing.value.immersive,
            itemStyle: {
              color: {
                type: "linear",
                x: 0,
                y: 0,
                x2: 1,
                y2: 0,
                colorStops: [
                  { offset: 0, color: "#2563eb" },
                  { offset: 1, color: "#60a5fa" },
                ],
              },
            },
          },
        ],
        barWidth: 22,
        label: {
          show: true,
          position: "right",
          color: "#00e4ff",
          fontSize: 14,
          fontWeight: "bold",
          formatter: "{c} 人",
        },
        itemStyle: { borderRadius: [0, 8, 8, 0] },
      },
    ],
  };
});

var couponOption = computed(function () {
  var rate = couponUsageRate.value || 0;
  return {
    series: [
      {
        type: "pie",
        radius: ["65%", "85%"],
        center: ["50%", "50%"],
        label: {
          show: true,
          position: "center",
          formatter: rate + "%",
          fontSize: 16,
          fontWeight: "bold",
          color: "#00e4ff",
        },
        data: [
          { value: rate, itemStyle: { color: "#00e4ff" } },
          { value: 100 - rate, itemStyle: { color: "#0d2b45" } },
        ],
        emphasis: { disabled: true },
        animationType: "scale",
      },
    ],
  };
});

async function loadData() {
  try {
    const ready = await ensureCloudReady(); if (!ready) throw new Error("云开发初始化失败");
    var res = await callCloudFunction("getDashboardData", { trendRange: trendRange.value });
    if (res && res.success && res.data) {
      var d = res.data;
      todayOrderCount.value = d.todayOrderCount || 0;
      todayRevenue.value = d.todayRevenue || 0;
      todayNewUsers.value = d.todayNewUsers || 0;
      usingSeats.value = d.usingSeats || 0;
      totalSeats.value = d.totalSeats || 0;
      availableSeats.value = d.availableSeats || 0;
      fixSeats.value = d.fixSeats || 0;
      usageRate.value = d.usageRate || 0;
      zoneUsing.value = d.zoneUsing || { immersive: 0, sunshine: 0, vip: 0 };
      totalUsers.value = d.totalUsers || 0;
      totalOrderCount.value = d.totalOrderCount || 0;
      totalRevenue.value = d.totalRevenue || 0;
      weekRevenueData.value = d.weekRevenueData || [0, 0, 0, 0, 0, 0, 0];
      weekOrderData.value = d.weekOrderData || [0, 0, 0, 0, 0, 0, 0];
      planTypeCount.value = d.planTypeCount || { hour: 0, day: 0, week: 0 };
      totalCoupons.value = d.totalCoupons || 0;
      usedCoupons.value = d.usedCoupons || 0;
      couponUsageRate.value = d.couponUsageRate || 0;
      if (d.trendLabels) trendLabels.value = d.trendLabels;
      if (d.trendRevenueData) trendRevenueData.value = d.trendRevenueData;
      if (d.trendOrderData) trendOrderData.value = d.trendOrderData;
    }
  } catch (e) {
    console.error("大屏数据加载失败:", e);
  }
}

function switchTrendRange(range) {
  trendRange.value = range;
  loadData();
}

function updateTime() {
  var now = new Date();
  var y = now.getFullYear();
  var m = String(now.getMonth() + 1).padStart(2, "0");
  var d = String(now.getDate()).padStart(2, "0");
  var h = String(now.getHours()).padStart(2, "0");
  var mi = String(now.getMinutes()).padStart(2, "0");
  var s = String(now.getSeconds()).padStart(2, "0");
  currentTime.value = y + "-" + m + "-" + d + " " + h + ":" + mi + ":" + s;
}

onMounted(function () {
  loadData();
  updateTime();
  timer = setInterval(function () {
    updateTime();
  }, 1000);
  setInterval(function () {
    loadData();
  }, 60000);
});

onUnmounted(function () {
  if (timer) clearInterval(timer);
});
</script>

<style scoped>
.data-screen {
  width: 100vw;
  height: 100vh;
  background: radial-gradient(ellipse at center, #0a1628 0%, #050d1a 100%);
  color: #c8e6f0;
  font-family: "DIN Alternate", "Orbitron", "Courier New", monospace;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.screen-header {
  height: 70px;
  min-height: 70px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  padding: 0 20px;
  border-bottom: 1px solid rgba(0, 228, 255, 0.15);
  background: linear-gradient(
    180deg,
    rgba(0, 50, 80, 0.4) 0%,
    transparent 100%
  );
}
.header-left,
.header-right {
  width: 25%;
  height: 40px;
}
.header-center {
  width: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
}
.header-title-deco {
  width: 60%;
  height: 20px;
}
.screen-title {
  font-size: 26px;
  font-weight: 700;
  letter-spacing: 8px;
  color: #00e4ff;
  text-shadow: 0 0 20px rgba(0, 228, 255, 0.5), 0 0 40px rgba(0, 228, 255, 0.2);
  margin: 0;
  padding: 0;
}
.header-time {
  position: absolute;
  right: 30px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 14px;
  color: #7fb3d3;
  letter-spacing: 2px;
}

.screen-body {
  flex: 1;
  display: flex;
  padding: 10px 12px;
  gap: 10px;
  overflow: hidden;
  min-height: 0;
}

.panel-left,
.panel-right {
  width: 24%;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
}
.panel-center {
  width: 52%;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
}

.panel-box {
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(0, 228, 255, 0.15);
  border-radius: 6px;
  background: rgba(5, 20, 40, 0.6);
  position: relative;
  overflow: hidden;
  box-sizing: border-box;
}
.panel-box::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background: linear-gradient(90deg, transparent, #00e4ff, transparent);
}

.panel-title {
  font-size: 14px;
  font-weight: 600;
  color: #00e4ff;
  letter-spacing: 2px;
  padding-left: 4px;
  border-left: 3px solid #00e4ff;
  flex-shrink: 0;
  margin: 0;
}

.panel-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  flex-shrink: 0;
}

.range-btns {
  display: flex;
  gap: 4px;
}

.range-btn {
  font-size: 11px;
  padding: 3px 10px;
  border-radius: 4px;
  cursor: pointer;
  color: #7fb3d3;
  background: rgba(0, 228, 255, 0.06);
  border: 1px solid rgba(0, 228, 255, 0.15);
  transition: all 0.2s;
}

.range-btn:hover {
  background: rgba(0, 228, 255, 0.12);
}

.range-btn.active {
  color: #050d1a;
  background: #00e4ff;
  border-color: #00e4ff;
  font-weight: 600;
}

.kpi-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  flex: 1;
}
.kpi-card {
  background: rgba(0, 228, 255, 0.04);
  border: 1px solid rgba(0, 228, 255, 0.12);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8px 4px;
}
.kpi-num {
  width: 100%;
  height: 40px;
}
.kpi-label {
  font-size: 12px;
  color: #7fb3d3;
  margin-top: 2px;
}

.coupon-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ci-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.ci-label {
  font-size: 12px;
  color: #7fb3d3;
}
.ci-val {
  font-size: 16px;
  font-weight: 700;
  color: #c8e6f0;
}
.text-cyan {
  color: #00e4ff;
}

.seat-legend {
  display: flex;
  flex-direction: column;
  gap: 14px;
  flex-shrink: 0;
  padding-right: 8px;
}
.sl-item {
  display: flex;
  align-items: center;
  gap: 8px;
}
.sl-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}
.sl-label {
  font-size: 13px;
  color: #7fb3d3;
  min-width: 50px;
}
.sl-val {
  font-size: 18px;
  font-weight: 700;
}
.sl-divider {
  height: 1px;
  background: rgba(0, 228, 255, 0.15);
  margin: 4px 0;
}
.text-success {
  color: #10b981;
}
.text-warning {
  color: #f5a623;
}
.text-danger {
  color: #ef4444;
}

.total-stats {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 10px;
}
.total-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  background: rgba(0, 228, 255, 0.04);
  border: 1px solid rgba(0, 228, 255, 0.1);
  border-radius: 8px;
}
.total-label {
  font-size: 13px;
  color: #7fb3d3;
}
.total-num {
  width: 120px;
  height: 26px;
}
</style>
