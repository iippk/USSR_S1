<template>
  <div>
    <div class="stats-grid" style="grid-template-columns: repeat(3, 1fr)">
      <div class="stat-card">
        <h3>总用户数</h3>
        <div class="number">{{ userStats.total }}</div>
      </div>
      <div class="stat-card">
        <h3>总学习时长</h3>
        <div class="number">{{ formatDuration(userStats.totalStudyTime) }}</div>
      </div>
      <div class="stat-card">
        <h3>人均学习</h3>
        <div class="number">{{ formatDuration(userStats.avgStudyTime) }}</div>
      </div>
    </div>

    <div class="toolbar">
      <div class="toolbar-left">
        <input
          v-model="searchText"
          type="text"
          class="search-box"
          placeholder="搜索昵称/用户ID..."
          @input="filterUsers"
        />
        <button class="btn btn-primary" @click="loadUsers">刷新数据</button>
      </div>
    </div>

    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>用户ID</th>
            <th>昵称</th>
            <th>头像</th>
            <th>总学习时长</th>
            <th>注册时间</th>
            <th>最后更新</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in paginatedUsers" :key="user._id">
            <td>
              {{ user._openid ? user._openid.substring(0, 14) + "..." : "-" }}
            </td>
            <td>
              <strong>{{ user.nickName || "微信用户" }}</strong>
            </td>
            <td>
              <img
                v-if="user.avatarUrl"
                :src="getAvatarUrl(user.avatarUrl)"
                style="width: 32px; height: 32px; border-radius: 50%"
              />
              <span v-else>-</span>
            </td>
            <td>{{ formatDuration(user.totalStudyTime) }}</td>
            <td>{{ formatDate(user.createdAt) }}</td>
            <td>{{ formatDate(user.updatedAt) }}</td>
            <td>
              <button class="btn btn-primary" @click="viewDetail(user)">
                详情
              </button>
            </td>
          </tr>
          <tr v-if="filteredUsers.length === 0">
            <td colspan="7" class="empty-state">
              <div class="icon">👥</div>
              暂无用户数据
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
        共 {{ filteredUsers.length }} 条 / 第 {{ currentPage }}/{{ totalPages }}
        页
      </span>
    </div>

    <!-- 用户详情模态框 -->
    <Modal v-if="showDetailModal" title="用户详情" @close="closeDetailModal">
      <div class="detail-grid" v-if="selectedUser">
        <div class="detail-label">用户ID</div>
        <div class="detail-value">{{ selectedUser._openid || "-" }}</div>

        <div class="detail-label">昵称</div>
        <div class="detail-value">
          {{ selectedUser.nickName || "微信用户" }}
        </div>

        <div class="detail-label">头像</div>
        <div class="detail-value">
          <img
            v-if="selectedUser.avatarUrl"
            :src="getAvatarUrl(selectedUser.avatarUrl)"
            style="width: 64px; height: 64px; border-radius: 8px"
          />
          <span v-else>-</span>
        </div>

        <div class="detail-label">总学习时长</div>
        <div class="detail-value">
          {{ formatDuration(selectedUser.totalStudyTime) }}
        </div>

        <div class="detail-label">注册时间</div>
        <div class="detail-value">{{ formatDate(selectedUser.createdAt) }}</div>

        <div class="detail-label">最后更新</div>
        <div class="detail-value">{{ formatDate(selectedUser.updatedAt) }}</div>
      </div>
    </Modal>
  </div>
</template>

<script setup>
import { ref, computed, inject } from "vue";
import {
  getDB,
  ensureCloudReady,
  formatDate as fmtDate,
  formatDuration as fmtDuration,
  getAvatarUrl,
} from "../utils/cloudBase.js";
import { PAGE_SIZE } from "../config/cloud.js";
import Modal from "../components/Modal.vue";

const toast = inject("toast");
const loading = inject("loading");

const allUsers = ref([]);
const filteredUsers = ref([]);
const searchText = ref("");
const currentPage = ref(1);
const showDetailModal = ref(false);
const selectedUser = ref(null);

const userStats = computed(() => {
  const total = allUsers.value.length;
  const totalStudyTime = allUsers.value.reduce(
    (sum, u) => sum + (u.totalStudyTime || 0),
    0
  );
  const avgStudyTime = total > 0 ? Math.floor(totalStudyTime / total) : 0;
  return { total, totalStudyTime, avgStudyTime };
});

const totalPages = computed(() =>
  Math.ceil(filteredUsers.value.length / PAGE_SIZE)
);

const paginatedUsers = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE;
  return filteredUsers.value.slice(start, start + PAGE_SIZE);
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

const loadUsers = async () => {
  loading.showLoadingState(true);
  try {
    const ready = await ensureCloudReady(); if (!ready) throw new Error("云开发初始化失败");

    const db = getDB();
    if (!db) {
      throw new Error("数据库连接失败");
    }

    const res = await db
      .collection("users")
      .orderBy("createdAt", "desc")
      .limit(300)
      .get();
    allUsers.value = res.data || [];
    filterUsers();
  } catch (error) {
    console.error("加载用户失败:", error);
    toast.showToastMessage("加载用户数据失败", "error");
  }
  loading.showLoadingState(false);
};

const filterUsers = () => {
  if (!searchText.value) {
    filteredUsers.value = [...allUsers.value];
  } else {
    const search = searchText.value.toLowerCase();
    filteredUsers.value = allUsers.value.filter((user) => {
      const nickName = (user.nickName || "").toLowerCase();
      const openid = (user._openid || "").toLowerCase();
      return nickName.includes(search) || openid.includes(search);
    });
  }
  currentPage.value = 1;
};

const viewDetail = (user) => {
  selectedUser.value = user;
  showDetailModal.value = true;
};

const closeDetailModal = () => {
  showDetailModal.value = false;
  selectedUser.value = null;
};

const formatDate = fmtDate;
const formatDuration = fmtDuration;

loadUsers();
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
