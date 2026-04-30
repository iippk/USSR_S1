<template>
  <div>
    <div class="stats-grid" style="grid-template-columns: repeat(4, 1fr)">
      <div class="stat-card">
        <h3>总订单数</h3>
        <div class="number">{{ orderStats.total }}</div>
      </div>
      <div class="stat-card">
        <h3>今日订单</h3>
        <div class="number">{{ orderStats.today }}</div>
      </div>
      <div class="stat-card revenue">
        <h3>总收入</h3>
        <div class="number">¥{{ orderStats.revenue.toFixed(2) }}</div>
      </div>
      <div class="stat-card">
        <h3>完成率</h3>
        <div class="number">{{ orderStats.completeRate }}%</div>
      </div>
    </div>

    <div class="toolbar">
      <div class="toolbar-left">
        <input
          v-model="searchText"
          type="text"
          class="search-box"
          placeholder="搜索订单号/座位号/用户ID..."
          @input="filterOrders"
        />
        <select
          v-model="statusFilter"
          class="filter-select"
          @change="filterOrders"
        >
          <option value="">全部状态</option>
          <option value="created">待支付</option>
          <option value="paid">已支付</option>
          <option value="completed">已完成</option>
          <option value="cancelled">已取消</option>
        </select>
        <button class="btn btn-primary" @click="loadOrders">刷新数据</button>
      </div>
      <div class="toolbar-right">
        <button class="btn btn-success" @click="exportCSV">导出CSV</button>
      </div>
    </div>

    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>订单号</th>
            <th>座位号</th>
            <th>用户ID</th>
            <th>套餐类型</th>
            <th>数量</th>
            <th>总价</th>
            <th>状态</th>
            <th>创建时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="order in paginatedOrders" :key="order._id">
            <td>{{ order._id ? order._id.substring(0, 14) + "..." : "-" }}</td>
            <td>
              <strong>{{ order.seatNumber || "-" }}</strong>
            </td>
            <td>
              {{ order.userId ? order.userId.substring(0, 14) + "..." : "-" }}
            </td>
            <td>{{ planMap[order.planType] || order.planType || "-" }}</td>
            <td>{{ order.quantity || "-" }}</td>
            <td>
              <strong style="color: #dc3545"
                >¥{{ (order.totalPrice || 0).toFixed(2) }}</strong
              >
            </td>
            <td>
              <span :class="['status-badge', statusClass(order.status)]">
                {{ statusText(order.status) }}
              </span>
            </td>
            <td>{{ formatDate(order.createdAt) }}</td>
            <td>
              <button class="btn btn-primary" @click="viewDetail(order)">
                详情
              </button>
            </td>
          </tr>
          <tr v-if="filteredOrders.length === 0">
            <td colspan="9" class="empty-state">
              <div class="icon">📋</div>
              暂无订单数据
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="pagination" v-if="totalPages > 1">
      <button
        class="page-btn"
        :disabled="currentPage <= 1"
        @click="currentPage--"
      >
        上一页
      </button>
      <button
        v-for="page in visiblePages"
        :key="page"
        :class="['page-btn', { active: page === currentPage }]"
        @click="currentPage = page"
      >
        {{ page }}
      </button>
      <button
        class="page-btn"
        :disabled="currentPage >= totalPages"
        @click="currentPage++"
      >
        下一页
      </button>
      <span style="margin-left: 10px; color: #888; font-size: 13px">
        共 {{ filteredOrders.length }} 条 / 第 {{ currentPage }}/{{
          totalPages
        }}
        页
      </span>
    </div>

    <!-- 订单详情模态框 -->
    <Modal v-if="showDetailModal" title="订单详情" @close="closeDetailModal">
      <div class="detail-grid" v-if="selectedOrder">
        <div class="detail-label">订单编号</div>
        <div class="detail-value">{{ selectedOrder._id }}</div>

        <div class="detail-label">座位号</div>
        <div class="detail-value">{{ selectedOrder.seatNumber || "-" }}</div>

        <div class="detail-label">用户ID</div>
        <div class="detail-value">{{ selectedOrder.userId || "-" }}</div>

        <div class="detail-label">套餐类型</div>
        <div class="detail-value">
          {{ planMap[selectedOrder.planType] || selectedOrder.planType || "-" }}
        </div>

        <div class="detail-label">数量</div>
        <div class="detail-value">{{ selectedOrder.quantity || "-" }}</div>

        <div class="detail-label">单价</div>
        <div class="detail-value">
          ¥{{ (selectedOrder.unitPrice || 0).toFixed(2) }}
        </div>

        <div class="detail-label">总价</div>
        <div
          class="detail-value"
          style="color: #dc3545; font-weight: 700; font-size: 16px"
        >
          ¥{{ (selectedOrder.totalPrice || 0).toFixed(2) }}
        </div>

        <div class="detail-label">状态</div>
        <div class="detail-value">{{ statusText(selectedOrder.status) }}</div>

        <div class="detail-label">创建时间</div>
        <div class="detail-value">
          {{ formatDate(selectedOrder.createdAt) }}
        </div>

        <div class="detail-label">到期时间</div>
        <div class="detail-value">{{ formatDate(selectedOrder.expireAt) }}</div>

        <div class="detail-label">完成时间</div>
        <div class="detail-value">
          {{ formatDate(selectedOrder.completedAt) }}
        </div>
      </div>

      <template #footer>
        <button class="btn btn-outline" @click="closeDetailModal">关闭</button>
        <button
          v-if="selectedOrder && selectedOrder.status === 'paid'"
          class="btn btn-success"
          @click="completeOrder"
        >
          标记完成
        </button>
        <button
          v-if="
            selectedOrder &&
            (selectedOrder.status === 'paid' ||
              selectedOrder.status === 'created')
          "
          class="btn btn-danger"
          @click="cancelOrder"
        >
          取消订单
        </button>
      </template>
    </Modal>
  </div>
</template>

<script setup>
import { ref, computed, inject } from "vue";
import {
  getDB,
  isCloudReady,
  initCloudBase,
  formatDate as fmtDate,
} from "../utils/cloudBase.js";
import { PAGE_SIZE } from "../config/cloud.js";
import Modal from "../components/Modal.vue";

const toast = inject("toast");
const loading = inject("loading");

const allOrders = ref([]);
const filteredOrders = ref([]);
const searchText = ref("");
const statusFilter = ref("");
const currentPage = ref(1);
const showDetailModal = ref(false);
const selectedOrder = ref(null);

const planMap = { hour: "小时", day: "天", week: "周" };

const orderStats = computed(() => {
  const total = allOrders.value.length;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayCount = allOrders.value.filter(
    (o) => new Date(o.createdAt) >= today
  ).length;
  const paidOrders = allOrders.value.filter(
    (o) => o.status === "paid" || o.status === "completed"
  );
  const revenue = paidOrders.reduce((sum, o) => sum + (o.totalPrice || 0), 0);
  const completed = allOrders.value.filter(
    (o) => o.status === "completed"
  ).length;
  const completeRate = total > 0 ? ((completed / total) * 100).toFixed(1) : 0;
  return { total, today: todayCount, revenue, completeRate };
});

const totalPages = computed(() =>
  Math.ceil(filteredOrders.value.length / PAGE_SIZE)
);

const paginatedOrders = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE;
  return filteredOrders.value.slice(start, start + PAGE_SIZE);
});

const visiblePages = computed(() => {
  const maxVisible = 7;
  let start = Math.max(1, currentPage.value - Math.floor(maxVisible / 2));
  let end = Math.min(totalPages.value, start + maxVisible - 1);
  if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);
  const pages = [];
  for (let i = start; i <= end; i++) pages.push(i);
  return pages;
});

const statusClass = (status) => {
  const map = {
    created: "status-pending",
    paid: "status-in-use",
    completed: "status-free",
    cancelled: "status-cancelled",
  };
  return map[status] || "";
};

const statusText = (status) => {
  const map = {
    created: "待支付",
    paid: "已支付/使用中",
    completed: "已完成",
    cancelled: "已取消",
  };
  return map[status] || status;
};

const loadOrders = async () => {
  loading.showLoadingState(true);
  try {
    if (!isCloudReady()) {
      console.log("⏳ 云开发未初始化，正在初始化...");
      await initCloudBase();
    }

    const db = getDB();
    if (!db) {
      throw new Error("数据库连接失败");
    }

    const res = await db
      .collection("orders")
      .orderBy("createdAt", "desc")
      .limit(500)
      .get();
    allOrders.value = res.data || [];
    filterOrders();
  } catch (error) {
    console.error("加载订单失败:", error);
    toast.showToastMessage("加载订单数据失败", "error");
  }
  loading.showLoadingState(false);
};

const filterOrders = () => {
  filteredOrders.value = allOrders.value.filter((order) => {
    if (statusFilter.value && order.status !== statusFilter.value) return false;
    if (searchText.value) {
      const searchIn = (
        order._id +
        "" +
        (order.seatNumber || "") +
        "" +
        (order.userId || "")
      ).toLowerCase();
      if (!searchIn.includes(searchText.value.toLowerCase())) return false;
    }
    return true;
  });
  currentPage.value = 1;
};

const viewDetail = (order) => {
  selectedOrder.value = order;
  showDetailModal.value = true;
};

const closeDetailModal = () => {
  showDetailModal.value = false;
  selectedOrder.value = null;
};

const completeOrder = async () => {
  if (!confirm("确定要将此订单标记为已完成吗？")) return;

  loading.showLoadingState(true);

  try {
    const db = getDB();
    await db
      .collection("orders")
      .doc(selectedOrder.value._id)
      .update({
        data: {
          status: "completed",
          completedAt: new Date(),
          updatedAt: new Date(),
        },
      });
    toast.showToastMessage("订单已标记为完成", "success");
    closeDetailModal();
    await loadOrders();
  } catch (error) {
    toast.showToastMessage("操作失败: " + error.message, "error");
  }

  loading.showLoadingState(false);
};

const cancelOrder = async () => {
  if (!confirm("确定要取消此订单吗？")) return;

  loading.showLoadingState(true);

  try {
    const db = getDB();
    await db
      .collection("orders")
      .doc(selectedOrder.value._id)
      .update({
        data: {
          status: "cancelled",
          cancelledAt: new Date(),
          updatedAt: new Date(),
        },
      });
    toast.showToastMessage("订单已取消", "success");
    closeDetailModal();
    await loadOrders();
  } catch (error) {
    toast.showToastMessage("操作失败: " + error.message, "error");
  }

  loading.showLoadingState(false);
};

const exportCSV = () => {
  if (filteredOrders.value.length === 0) {
    toast.showToastMessage("没有可导出的数据", "warning");
    return;
  }

  const headers = [
    "订单号",
    "座位号",
    "用户ID",
    "套餐类型",
    "数量",
    "单价",
    "总价",
    "状态",
    "创建时间",
    "到期时间",
  ];
  const rows = filteredOrders.value.map((o) => [
    o._id || "",
    o.seatNumber || "",
    o.userId || "",
    o.planType || "",
    o.quantity || "",
    o.unitPrice || 0,
    o.totalPrice || 0,
    o.status || "",
    fmtDate(o.createdAt),
    fmtDate(o.expireAt),
  ]);

  let csv = "\uFEFF" + headers.join(",") + "\n";
  rows.forEach((row) => {
    csv += row.map((v) => `"${v}"`).join(",") + "\n";
  });

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `订单导出_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast.showToastMessage("订单数据已导出", "success");
};

const formatDate = fmtDate;

loadOrders();
</script>

<style scoped>
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 12px;
}

.toolbar-left {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.toolbar-right {
  display: flex;
  gap: 10px;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  margin-top: 20px;
  flex-wrap: wrap;
}

.page-btn {
  padding: 8px 14px;
  border: 2px solid #e1e1e1;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  transition: all 0.3s;
}

.page-btn:hover:not(:disabled) {
  border-color: #667eea;
  color: #667eea;
}

.page-btn.active {
  background: #667eea;
  color: white;
  border-color: #667eea;
}

.page-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.detail-grid {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 12px 16px;
  font-size: 14px;
}

.detail-label {
  color: #888;
  font-weight: 500;
}

.detail-value {
  color: #333;
  word-break: break-all;
}
</style>
