<template>
  <div>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon-wrap seats"><span>🪑</span></div>
        <div class="stat-info">
          <h3>总座位数</h3>
          <div class="number">{{ stats.totalSeats }}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon-wrap free"><span>✅</span></div>
        <div class="stat-info">
          <h3>空闲座位</h3>
          <div class="number" style="color: var(--color-success)">
            {{ stats.freeSeats }}
          </div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon-wrap in-use"><span>🔥</span></div>
        <div class="stat-info">
          <h3>使用中</h3>
          <div class="number" style="color: var(--color-primary)">
            {{ stats.inUseSeats }}
          </div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon-wrap rate"><span>📊</span></div>
        <div class="stat-info">
          <h3>使用率</h3>
          <div class="number" style="color: var(--color-warning)">
            {{ stats.usageRate }}%
          </div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon-wrap orders"><span>📋</span></div>
        <div class="stat-info">
          <h3>总订单数</h3>
          <div class="number" style="color: var(--color-primary-light)">
            {{ stats.totalOrders }}
          </div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon-wrap revenue"><span>💰</span></div>
        <div class="stat-info">
          <h3>总收入</h3>
          <div class="number" style="color: var(--color-error)">
            ¥{{ stats.totalRevenue.toFixed(2) }}
          </div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon-wrap today"><span>📅</span></div>
        <div class="stat-info">
          <h3>今日订单</h3>
          <div class="number" style="color: #8b5cf6">
            {{ stats.todayOrders }}
          </div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon-wrap users"><span>👥</span></div>
        <div class="stat-info">
          <h3>总用户数</h3>
          <div class="number" style="color: #06b6d4">
            {{ stats.totalUsers }}
          </div>
        </div>
      </div>
    </div>

    <div class="charts-grid">
      <SeatUsageChart
        :data="{
          totalSeats: stats.totalSeats,
          freeSeats: stats.freeSeats,
          inUseSeats: stats.inUseSeats,
        }"
      />
      <OrderTrendChart :orders="allOrders" />
    </div>

    <div class="charts-grid single">
      <RevenueChart :orders="allOrders" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, inject } from "vue";
import { getDB, ensureCloudReady } from "../utils/cloudBase.js";
import SeatUsageChart from "../components/SeatUsageChart.vue";
import OrderTrendChart from "../components/OrderTrendChart.vue";
import RevenueChart from "../components/RevenueChart.vue";

const toast = inject("toast");
const loading = inject("loading");

const stats = ref({
  totalSeats: 0,
  freeSeats: 0,
  inUseSeats: 0,
  usageRate: 0,
  totalOrders: 0,
  totalRevenue: 0,
  todayOrders: 0,
  totalUsers: 0,
});

const allOrders = ref([]);

const loadStatistics = async () => {
  try {
    const ready = await ensureCloudReady();
    if (!ready) throw new Error("云开发初始化失败");

    const db = getDB();
    if (!db) throw new Error("数据库连接失败");

    const [seatsRes, ordersRes, usersRes] = await Promise.all([
      db.collection("seats").get(),
      db.collection("orders").limit(500).get(),
      db.collection("users").limit(300).get(),
    ]);

    const seats = seatsRes.data || [];
    const orders = ordersRes.data || [];
    const users = usersRes.data || [];

    allOrders.value = orders;

    const totalSeats = seats.length;
    const freeSeats = seats.filter(
      (s) => s.status === "空闲" || s.status === "free"
    ).length;
    const inUseSeats = seats.filter((s) => s.status === "使用中").length;
    const usageRate =
      totalSeats > 0 ? ((inUseSeats / totalSeats) * 100).toFixed(1) : 0;

    const paidOrders = orders.filter(
      (o) => o.status === "paid" || o.status === "completed"
    );
    const totalRevenue = paidOrders.reduce(
      (sum, o) => sum + (o.totalPrice || 0),
      0
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayOrders = orders.filter(
      (o) => new Date(o.createdAt) >= today
    ).length;

    stats.value = {
      totalSeats,
      freeSeats,
      inUseSeats,
      usageRate,
      totalOrders: orders.length,
      totalRevenue,
      todayOrders,
      totalUsers: users.length,
    };
  } catch (error) {
    console.error("加载统计数据失败:", error);
    toast.showToastMessage("加载统计数据失败", "error");
  }
};

onMounted(() => {
  loadStatistics();
});
</script>

<style scoped>
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: var(--color-surface);
  padding: 20px;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  gap: 16px;
  transition: all var(--transition-normal);
  box-shadow: var(--shadow-card);
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-hover);
}

.stat-icon-wrap {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}

.stat-icon-wrap.seats {
  background: var(--color-primary-bg);
}
.stat-icon-wrap.free {
  background: var(--color-success-bg);
}
.stat-icon-wrap.in-use {
  background: var(--color-primary-bg);
}
.stat-icon-wrap.rate {
  background: var(--color-warning-bg);
}
.stat-icon-wrap.orders {
  background: #edf4ff;
}
.stat-icon-wrap.revenue {
  background: var(--color-error-bg);
}
.stat-icon-wrap.today {
  background: #f3eeff;
}
.stat-icon-wrap.users {
  background: #e6fafa;
}

.stat-info {
  flex: 1;
  min-width: 0;
}

.stat-info h3 {
  color: var(--color-text-aux);
  font: var(--font-small);
  margin-bottom: 4px;
  letter-spacing: 0.3px;
}

.stat-info .number {
  font: 700 24px/1.2 var(--font-family);
  color: var(--color-text-primary);
}

.charts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(450px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.charts-grid.single {
  grid-template-columns: 1fr;
}

@media (max-width: 1024px) {
  .charts-grid {
    grid-template-columns: 1fr;
  }

  .stats-grid {
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  }
}
</style>
