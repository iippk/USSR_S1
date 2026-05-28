<template>
  <div>
    <div class="toolbar">
      <div class="toolbar-left">
        <select
          v-model="typeFilter"
          class="filter-select"
          @change="filterAnnouncements"
        >
          <option value="">全部类型</option>
          <option value="notice">通知</option>
          <option value="activity">活动</option>
          <option value="maintenance">维护</option>
          <option value="urgent">紧急</option>
        </select>
        <select
          v-model="statusFilter"
          class="filter-select"
          @change="filterAnnouncements"
        >
          <option value="">全部状态</option>
          <option value="active">显示中</option>
          <option value="inactive">已下线</option>
        </select>
        <button class="btn btn-primary" @click="loadAnnouncements">刷新</button>
      </div>
      <div class="toolbar-right">
        <button class="btn btn-success" @click="openCreateModal">
          + 发布公告
        </button>
      </div>
    </div>

    <div class="announcement-list" v-if="filteredAnnouncements.length > 0">
      <div
        v-for="item in filteredAnnouncements"
        :key="item._id"
        class="announcement-card"
        :class="{ pinned: item.isPinned }"
      >
        <div class="card-header">
          <div class="card-left">
            <span :class="['type-badge', `type-${item.type}`]">{{
              typeText(item.type)
            }}</span>
            <span v-if="item.isPinned" class="pin-badge">📌 置顶</span>
            <span
              :class="[
                'status-dot',
                item.status === 'active' ? 'dot-active' : 'dot-inactive',
              ]"
            ></span>
            <span class="card-title">{{ item.title }}</span>
          </div>
          <div class="card-right">
            <span class="card-time">{{ formatDate(item.createdAt) }}</span>
          </div>
        </div>
        <div class="card-body">{{ item.content }}</div>
        <div class="card-footer">
          <div class="card-meta">
            <span v-if="item.startTime"
              >显示：{{ formatDate(item.startTime) }} ~
              {{ formatDate(item.endTime) }}</span
            >
            <span v-else>永久显示</span>
          </div>
          <div class="card-actions">
            <button
              v-if="item.status === 'active'"
              class="btn btn-warning"
              @click="toggleStatus(item, 'inactive')"
            >
              下线
            </button>
            <button
              v-else
              class="btn btn-success"
              @click="toggleStatus(item, 'active')"
            >
              上线
            </button>
            <button class="btn btn-ghost" @click="togglePin(item)">
              {{ item.isPinned ? "取消置顶" : "置顶" }}
            </button>
            <button class="btn btn-primary" @click="openEditModal(item)">
              编辑
            </button>
            <button class="btn btn-danger" @click="deleteAnnouncement(item)">
              删除
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="empty-state">
      <div class="icon">📢</div>
      暂无公告
    </div>

    <Modal
      v-if="showModal"
      :title="editId ? '编辑公告' : '发布公告'"
      @close="showModal = false"
      @confirm="saveAnnouncement"
    >
      <div class="form-group">
        <label>公告标题 *</label>
        <input
          v-model="formData.title"
          type="text"
          placeholder="请输入公告标题"
        />
      </div>
      <div class="form-group">
        <label>公告内容 *</label>
        <textarea
          v-model="formData.content"
          placeholder="请输入公告内容"
          rows="4"
          style="
            width: 100%;
            padding: 10px 14px;
            border: 1px solid var(--color-border);
            border-radius: var(--radius-md);
            font: var(--font-body);
            resize: vertical;
            transition: all var(--transition-normal);
          "
          onfocus="this.style.borderColor='var(--color-primary)'"
          onblur="this.style.borderColor='var(--color-border)'"
        ></textarea>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>类型</label>
          <select
            v-model="formData.type"
            class="filter-select"
            style="width: 100%"
          >
            <option value="notice">通知</option>
            <option value="activity">活动</option>
            <option value="maintenance">维护</option>
            <option value="urgent">紧急</option>
          </select>
        </div>
        <div class="form-group">
          <label>状态</label>
          <select
            v-model="formData.status"
            class="filter-select"
            style="width: 100%"
          >
            <option value="active">立即显示</option>
            <option value="inactive">暂不上线</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>开始显示时间</label>
          <input v-model="formData.startTime" type="datetime-local" />
        </div>
        <div class="form-group">
          <label>结束显示时间</label>
          <input v-model="formData.endTime" type="datetime-local" />
        </div>
      </div>
      <div class="form-group">
        <label
          style="display: flex; align-items: center; gap: 8px; cursor: pointer"
        >
          <input
            v-model="formData.isPinned"
            type="checkbox"
            style="width: 16px; height: 16px"
          />
          置顶此公告
        </label>
      </div>
    </Modal>
  </div>
</template>

<script setup>
import { ref, inject } from "vue";
import {
  callCloudFunction,
  ensureCloudReady,
  formatDate as fmtDate,
} from "../utils/cloudBase.js";
import Modal from "../components/Modal.vue";

const toast = inject("toast");
const loading = inject("loading");

const allAnnouncements = ref([]);
const filteredAnnouncements = ref([]);
const typeFilter = ref("");
const statusFilter = ref("");
const showModal = ref(false);
const editId = ref("");

const formData = ref({
  title: "",
  content: "",
  type: "notice",
  status: "active",
  startTime: "",
  endTime: "",
  isPinned: false,
});

const typeText = (type) => {
  const map = {
    notice: "通知",
    activity: "活动",
    maintenance: "维护",
    urgent: "紧急",
  };
  return map[type] || type;
};

const loadAnnouncements = async () => {
  loading.showLoadingState(true);
  try {
    const ready = await ensureCloudReady(); if (!ready) throw new Error("云开发初始化失败");
    const res = await callCloudFunction("getSettings", {
      action: "getAllAnnouncements",
    });
    allAnnouncements.value = res && res.success && res.data ? res.data : [];
    filterAnnouncements();
  } catch (error) {
    console.error("加载公告失败:", error);
    allAnnouncements.value = [];
    filteredAnnouncements.value = [];
    toast.showToastMessage("加载公告失败", "error");
  }
  loading.showLoadingState(false);
};

const filterAnnouncements = () => {
  filteredAnnouncements.value = allAnnouncements.value
    .filter((a) => {
      if (typeFilter.value && a.type !== typeFilter.value) return false;
      if (statusFilter.value && a.status !== statusFilter.value) return false;
      return true;
    })
    .sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
};

const openCreateModal = () => {
  editId.value = "";
  formData.value = {
    title: "",
    content: "",
    type: "notice",
    status: "active",
    startTime: "",
    endTime: "",
    isPinned: false,
  };
  showModal.value = true;
};

const openEditModal = (item) => {
  editId.value = item._id;
  formData.value = {
    title: item.title || "",
    content: item.content || "",
    type: item.type || "notice",
    status: item.status || "active",
    startTime: item.startTime
      ? new Date(item.startTime).toISOString().slice(0, 16)
      : "",
    endTime: item.endTime
      ? new Date(item.endTime).toISOString().slice(0, 16)
      : "",
    isPinned: item.isPinned || false,
  };
  showModal.value = true;
};

const saveAnnouncement = async () => {
  if (!formData.value.title || !formData.value.content) {
    toast.showToastMessage("请填写标题和内容", "warning");
    return;
  }

  loading.showLoadingState(true);
  try {
    const ready = await ensureCloudReady(); if (!ready) throw new Error("云开发初始化失败");

    const announcementData = {
      title: formData.value.title,
      content: formData.value.content,
      type: formData.value.type,
      status: formData.value.status,
      startTime: formData.value.startTime
        ? new Date(formData.value.startTime)
        : null,
      endTime: formData.value.endTime ? new Date(formData.value.endTime) : null,
      isPinned: formData.value.isPinned || false,
    };

    const res = await callCloudFunction("getSettings", {
      action: "saveAnnouncement",
      announcementData: announcementData,
      editId: editId.value || null,
    });

    if (res && res.success) {
      toast.showToastMessage(
        editId.value ? "公告已更新" : "公告已发布",
        "success"
      );
      showModal.value = false;
      await loadAnnouncements();
    } else {
      toast.showToastMessage("保存失败: " + (res.error || "未知错误"), "error");
    }
  } catch (error) {
    toast.showToastMessage("保存失败: " + error.message, "error");
  }
  loading.showLoadingState(false);
};

const toggleStatus = async (item, newStatus) => {
  loading.showLoadingState(true);
  try {
    const ready = await ensureCloudReady(); if (!ready) throw new Error("云开发初始化失败");
    const res = await callCloudFunction("getSettings", {
      action: "updateAnnouncement",
      announcementId: item._id,
      updateData: { status: newStatus },
    });
    if (res && res.success) {
      toast.showToastMessage(
        newStatus === "active" ? "公告已上线" : "公告已下线",
        "success"
      );
      await loadAnnouncements();
    } else {
      toast.showToastMessage("操作失败", "error");
    }
  } catch (error) {
    toast.showToastMessage("操作失败", "error");
  }
  loading.showLoadingState(false);
};

const togglePin = async (item) => {
  loading.showLoadingState(true);
  try {
    const ready = await ensureCloudReady(); if (!ready) throw new Error("云开发初始化失败");
    const res = await callCloudFunction("getSettings", {
      action: "updateAnnouncement",
      announcementId: item._id,
      updateData: { isPinned: !item.isPinned },
    });
    if (res && res.success) {
      toast.showToastMessage(
        item.isPinned ? "已取消置顶" : "已置顶",
        "success"
      );
      await loadAnnouncements();
    } else {
      toast.showToastMessage("操作失败", "error");
    }
  } catch (error) {
    toast.showToastMessage("操作失败", "error");
  }
  loading.showLoadingState(false);
};

const deleteAnnouncement = async (item) => {
  if (!confirm("确定要删除此公告吗？")) return;
  loading.showLoadingState(true);
  try {
    const ready = await ensureCloudReady(); if (!ready) throw new Error("云开发初始化失败");
    const res = await callCloudFunction("getSettings", {
      action: "deleteAnnouncement",
      announcementId: item._id,
    });
    if (res && res.success) {
      toast.showToastMessage("公告已删除", "success");
      await loadAnnouncements();
    } else {
      toast.showToastMessage("删除失败", "error");
    }
  } catch (error) {
    toast.showToastMessage("删除失败", "error");
  }
  loading.showLoadingState(false);
};

const formatDate = fmtDate;

loadAnnouncements();
</script>

<style scoped>
.announcement-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.announcement-card {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: 20px;
  box-shadow: var(--shadow-card);
  border-left: 4px solid var(--color-border-light);
  transition: all var(--transition-normal);
}

.announcement-card:hover {
  box-shadow: var(--shadow-hover);
}

.announcement-card.pinned {
  border-left-color: var(--color-primary);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  flex-wrap: wrap;
  gap: 8px;
}

.card-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.type-badge {
  padding: 3px 10px;
  border-radius: 12px;
  font: 500 12px/1 var(--font-family);
}

.type-notice {
  background: var(--color-primary-bg);
  color: var(--color-primary);
}
.type-activity {
  background: var(--color-success-bg);
  color: var(--color-success);
}
.type-maintenance {
  background: var(--color-warning-bg);
  color: var(--color-warning);
}
.type-urgent {
  background: var(--color-error-bg);
  color: var(--color-error);
}

.pin-badge {
  font: 500 12px/1 var(--font-family);
  color: var(--color-primary);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.dot-active {
  background: var(--color-success);
}
.dot-inactive {
  background: var(--color-text-aux);
}

.card-title {
  font: 600 15px/1.3 var(--font-family);
  color: var(--color-text-primary);
}

.card-time {
  font: var(--font-small);
  color: var(--color-text-aux);
}

.card-body {
  color: var(--color-text-body);
  font: var(--font-body);
  margin-bottom: 14px;
  line-height: 1.7;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.card-meta {
  font: var(--font-small);
  color: var(--color-text-aux);
}

.card-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
</style>
