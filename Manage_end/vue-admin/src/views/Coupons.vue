<template>
  <div>
    <div class="stats-grid" style="grid-template-columns: repeat(4, 1fr)">
      <div class="stat-card">
        <div class="stat-icon-wrap" style="background: var(--color-primary-bg)">
          <span>🎫</span>
        </div>
        <div class="stat-info">
          <h3>总优惠券</h3>
          <div class="number" style="color: var(--color-primary)">
            {{ couponStats.total }}
          </div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon-wrap" style="background: var(--color-success-bg)">
          <span>✅</span>
        </div>
        <div class="stat-info">
          <h3>可用</h3>
          <div class="number" style="color: var(--color-success)">
            {{ couponStats.available }}
          </div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon-wrap" style="background: var(--color-warning-bg)">
          <span>📌</span>
        </div>
        <div class="stat-info">
          <h3>已使用</h3>
          <div class="number" style="color: var(--color-warning)">
            {{ couponStats.used }}
          </div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon-wrap" style="background: var(--color-error-bg)">
          <span>⏰</span>
        </div>
        <div class="stat-info">
          <h3>已过期</h3>
          <div class="number" style="color: var(--color-error)">
            {{ couponStats.expired }}
          </div>
        </div>
      </div>
    </div>

    <div class="toolbar">
      <div class="toolbar-left">
        <select
          v-model="statusFilter"
          class="filter-select"
          @change="filterCoupons"
        >
          <option value="">全部状态</option>
          <option value="available">可用</option>
          <option value="used">已使用</option>
          <option value="expired">已过期</option>
        </select>
        <select
          v-model="typeFilter"
          class="filter-select"
          @change="filterCoupons"
        >
          <option value="">全部类型</option>
          <option value="满10减3">满10减3</option>
          <option value="满50减15">满50减15</option>
          <option value="满300减100">满300减100</option>
        </select>
        <button class="btn btn-primary" @click="loadCoupons">刷新</button>
      </div>
      <div class="toolbar-right">
        <button class="btn btn-success" @click="openCreateModal">
          + 创建优惠券
        </button>
        <button class="btn btn-outline" @click="batchCreate">
          批量发放新人券
        </button>
      </div>
    </div>

    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>优惠券ID</th>
            <th>类型</th>
            <th>折扣金额</th>
            <th>最低消费</th>
            <th>状态</th>
            <th>用户</th>
            <th>过期时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="coupon in paginatedCoupons" :key="coupon._id">
            <td>
              {{ coupon._id ? coupon._id.substring(0, 12) + "..." : "-" }}
            </td>
            <td>
              <strong>{{ coupon.type || "-" }}</strong>
            </td>
            <td style="color: var(--color-error); font-weight: 600">
              ¥{{ coupon.discountAmount || 0 }}
            </td>
            <td>满¥{{ coupon.minAmount || 0 }}</td>
            <td>
              <span :class="['status-badge', couponStatusClass(coupon)]">
                {{ couponStatusText(coupon) }}
              </span>
            </td>
            <td>
              {{
                coupon._openid === "POOL"
                  ? "券池"
                  : coupon._openid === "NEW_USER"
                  ? "新人"
                  : coupon._openid
                  ? coupon._openid.substring(0, 10) + "..."
                  : "-"
              }}
            </td>
            <td>{{ formatDate(coupon.expireAt) }}</td>
            <td>
              <button
                v-if="couponStatusText(coupon) === '可用'"
                class="btn btn-danger"
                @click="deleteCoupon(coupon)"
              >
                删除
              </button>
              <button v-else class="btn btn-ghost" disabled>已处理</button>
            </td>
          </tr>
          <tr v-if="filteredCoupons.length === 0">
            <td colspan="8" class="empty-state">
              <div class="icon">🎫</div>
              暂无优惠券数据
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
      <span
        style="margin-left: 10px; color: var(--color-text-aux); font-size: 12px"
        >共 {{ filteredCoupons.length }} 条</span
      >
    </div>

    <Modal
      v-if="showCreateModal"
      title="创建优惠券"
      @close="showCreateModal = false"
      @confirm="createCoupon"
    >
      <div class="form-group">
        <label>优惠券类型</label>
        <select
          v-model="formData.type"
          class="filter-select"
          style="width: 100%"
        >
          <option value="满10减3">满10减3</option>
          <option value="满50减15">满50减15</option>
          <option value="满300减100">满300减100</option>
          <option value="custom">自定义</option>
        </select>
      </div>
      <template v-if="formData.type === 'custom'">
        <div class="form-row">
          <div class="form-group">
            <label>最低消费 (¥)</label>
            <input
              v-model.number="formData.minAmount"
              type="number"
              placeholder="如：10"
              min="0"
            />
          </div>
          <div class="form-group">
            <label>折扣金额 (¥)</label>
            <input
              v-model.number="formData.discountAmount"
              type="number"
              placeholder="如：3"
              min="0"
            />
          </div>
        </div>
      </template>
      <div class="form-group">
        <label>发放数量</label>
        <input
          v-model.number="formData.count"
          type="number"
          placeholder="发放张数"
          min="1"
          max="100"
        />
      </div>
      <div class="form-group">
        <label>有效期（天）</label>
        <input
          v-model.number="formData.expireDays"
          type="number"
          placeholder="如：365"
          min="1"
        />
      </div>
      <div class="form-group">
        <label>发放方式</label>
        <select
          v-model="formData.method"
          class="filter-select"
          style="width: 100%"
        >
          <option value="pool">放入券池（用户领取）</option>
          <option value="newuser">新人注册自动发放</option>
        </select>
      </div>
    </Modal>
  </div>
</template>

<script setup>
import { ref, computed, inject } from "vue";
import {
  callCloudFunction,
  isCloudReady,
  initCloudBase,
  formatDate as fmtDate,
} from "../utils/cloudBase.js";
import { PAGE_SIZE } from "../config/cloud.js";
import Modal from "../components/Modal.vue";

const toast = inject("toast");
const loading = inject("loading");

const allCoupons = ref([]);
const filteredCoupons = ref([]);
const statusFilter = ref("");
const typeFilter = ref("");
const currentPage = ref(1);
const showCreateModal = ref(false);

const TYPE_MAP = {
  满10减3: { minAmount: 10, discountAmount: 3 },
  满50减15: { minAmount: 50, discountAmount: 15 },
  满300减100: { minAmount: 300, discountAmount: 100 },
};

const formData = ref({
  type: "满10减3",
  minAmount: 10,
  discountAmount: 3,
  count: 10,
  expireDays: 365,
  method: "pool",
});

const couponStats = computed(() => {
  const now = new Date();
  const total = allCoupons.value.length;
  const available = allCoupons.value.filter(
    (c) =>
      c.status === "available" && (!c.expireAt || new Date(c.expireAt) > now)
  ).length;
  const used = allCoupons.value.filter((c) => c.status === "used").length;
  const expired = allCoupons.value.filter(
    (c) =>
      c.status === "expired" ||
      (c.expireAt && new Date(c.expireAt) <= now && c.status !== "used")
  ).length;
  return { total, available, used, expired };
});

const totalPages = computed(() =>
  Math.ceil(filteredCoupons.value.length / PAGE_SIZE)
);
const paginatedCoupons = computed(() =>
  filteredCoupons.value.slice(
    (currentPage.value - 1) * PAGE_SIZE,
    currentPage.value * PAGE_SIZE
  )
);
const visiblePages = computed(() => {
  const max = 7;
  let s = Math.max(1, currentPage.value - Math.floor(max / 2));
  let e = Math.min(totalPages.value, s + max - 1);
  if (e - s < max - 1) s = Math.max(1, e - max + 1);
  const pages = [];
  for (let i = s; i <= e; i++) pages.push(i);
  return pages;
});

const couponStatusClass = (coupon) => {
  if (coupon.status === "used") return "status-cancelled";
  if (
    coupon.status === "expired" ||
    (coupon.expireAt && new Date(coupon.expireAt) <= new Date())
  )
    return "status-pending";
  return "status-free";
};

const couponStatusText = (coupon) => {
  if (coupon.status === "used") return "已使用";
  if (
    coupon.status === "expired" ||
    (coupon.expireAt && new Date(coupon.expireAt) <= new Date())
  )
    return "已过期";
  return "可用";
};

const loadCoupons = async () => {
  loading.showLoadingState(true);
  try {
    if (!isCloudReady()) await initCloudBase();
    const res = await callCloudFunction("getSettings", {
      action: "getAllCoupons",
    });
    allCoupons.value = res && res.success && res.data ? res.data : [];
    filterCoupons();
  } catch (error) {
    console.error("加载优惠券失败:", error);
    toast.showToastMessage("加载优惠券失败", "error");
  }
  loading.showLoadingState(false);
};

const filterCoupons = () => {
  const now = new Date();
  filteredCoupons.value = allCoupons.value.filter((c) => {
    if (statusFilter.value) {
      if (
        statusFilter.value === "available" &&
        (c.status !== "available" ||
          (c.expireAt && new Date(c.expireAt) <= now))
      )
        return false;
      if (statusFilter.value === "used" && c.status !== "used") return false;
      if (
        statusFilter.value === "expired" &&
        c.status !== "expired" &&
        (!c.expireAt || new Date(c.expireAt) > now)
      )
        return false;
    }
    if (typeFilter.value && c.type !== typeFilter.value) return false;
    return true;
  });
  currentPage.value = 1;
};

const openCreateModal = () => {
  formData.value = {
    type: "满10减3",
    minAmount: 10,
    discountAmount: 3,
    count: 10,
    expireDays: 365,
    method: "pool",
  };
  showCreateModal.value = true;
};

const createCoupon = async () => {
  const fd = formData.value;
  if (!fd.count || fd.count < 1) {
    toast.showToastMessage("请输入发放数量", "warning");
    return;
  }
  if (!fd.expireDays || fd.expireDays < 1) {
    toast.showToastMessage("请输入有效期", "warning");
    return;
  }

  let minAmount = fd.minAmount;
  let discountAmount = fd.discountAmount;
  let typeName = fd.type;

  if (fd.type !== "custom" && TYPE_MAP[fd.type]) {
    minAmount = TYPE_MAP[fd.type].minAmount;
    discountAmount = TYPE_MAP[fd.type].discountAmount;
  } else if (fd.type === "custom") {
    if (!minAmount || !discountAmount) {
      toast.showToastMessage("请填写金额", "warning");
      return;
    }
    typeName = `满${minAmount}减${discountAmount}`;
  }

  loading.showLoadingState(true);
  try {
    if (!isCloudReady()) await initCloudBase();
    const res = await callCloudFunction("getSettings", {
      action: "createCoupons",
      couponData: {
        type: typeName,
        minAmount,
        discountAmount,
        count: fd.count,
        expireDays: fd.expireDays,
        method: fd.method,
      },
    });
    if (res && res.success) {
      toast.showToastMessage(
        `成功创建 ${res.count || fd.count} 张优惠券`,
        "success"
      );
      showCreateModal.value = false;
      await loadCoupons();
    } else {
      toast.showToastMessage("创建失败: " + (res.error || "未知错误"), "error");
    }
  } catch (error) {
    toast.showToastMessage("创建失败: " + error.message, "error");
  }
  loading.showLoadingState(false);
};

const batchCreate = async () => {
  if (
    !confirm(
      "确定要批量发放新人优惠券吗？\n\n将创建3种类型各10张，共30张优惠券\n新人注册时自动发放"
    )
  )
    return;

  loading.showLoadingState(true);
  try {
    if (!isCloudReady()) await initCloudBase();
    const res = await callCloudFunction("getSettings", {
      action: "batchCreateNewUserCoupons",
    });
    if (res && res.success) {
      toast.showToastMessage(
        `成功创建 ${res.count || 30} 张新人优惠券`,
        "success"
      );
      await loadCoupons();
    } else {
      toast.showToastMessage(
        "批量创建失败: " + (res.error || "未知错误"),
        "error"
      );
    }
  } catch (error) {
    toast.showToastMessage("批量创建失败: " + error.message, "error");
  }
  loading.showLoadingState(false);
};

const deleteCoupon = async (coupon) => {
  if (!confirm("确定要删除此优惠券吗？")) return;
  loading.showLoadingState(true);
  try {
    if (!isCloudReady()) await initCloudBase();
    const res = await callCloudFunction("getSettings", {
      action: "deleteCoupon",
      couponId: coupon._id,
    });
    if (res && res.success) {
      toast.showToastMessage("优惠券已删除", "success");
      await loadCoupons();
    } else {
      toast.showToastMessage("删除失败: " + (res.error || "未知错误"), "error");
    }
  } catch (error) {
    toast.showToastMessage("删除失败: " + error.message, "error");
  }
  loading.showLoadingState(false);
};

const formatDate = fmtDate;

loadCoupons();
</script>

<style scoped>
.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
</style>
