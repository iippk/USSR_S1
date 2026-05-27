// rank.js - 排行榜页面 · v5.0 (彻底修复今日榜 + 增强验证)
var i18n = require('../../i18n/i18n.js')
Page({
  data: {
    i18n: {},
    currentLang: 'zh-CN',
    ranking: [],
    pagedRanking: [],
    isLoading: true,
    currentUserRank: null,
    rankType: 'total',
    currentUserOpenid: null,
    currentPage: 1,
    totalPages: 1,
    pageSize: 5,
    messages: [],
    showMessageInput: false,
    messageContent: '',
    isSubmittingMessage: false,
    isLoadingMessages: true,
    emptySlots: []
  },

  applyLanguage: function() {
    var lang = i18n.getCurrentLang()
    var text = i18n.getPageText('rank')
    this.setData({ i18n: text, currentLang: lang })
  },

  onLoad: function() {
    this.applyLanguage();
    this.checkLoginStatus();
    var app = getApp();
    if (app.globalData.userInfo) {
      this.setData({
        currentUserOpenid: app.globalData.userInfo._openid
      });
    }
  },

  onShow: function() {
    this.applyLanguage();
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().applyLanguage();
      this.getTabBar().switchTo(3);
    }
    this.getRanking();
    this.getMessages();
  },

  checkLoginStatus: function() {
    var app = getApp();
    if (!app.globalData.userInfo) {
      wx.showModal({
        title: this.data.i18n.tip,
        content: this.data.i18n.loginToViewRank,
        success: function(res) {
          if (res.confirm) {
            wx.switchTab({ url: '/pages/mine/mine' });
          }
        }
      });
    }
  },

  switchRankType: function(e) {
    var type = e.currentTarget.dataset.type;
    console.log('[Rank Page] 切换榜单类型:', type, '- 当前类型:', this.data.rankType);
    
    if (type === this.data.rankType) return;
    
    console.log('[Rank Page] 清空旧数据，准备加载新榜单...');
    this.setData({ 
      rankType: type, 
      ranking: [], 
      pagedRanking: [],
      isLoading: true, 
      currentUserRank: null,
      currentPage: 1,
      totalPages: 1
    });
    
    var that = this;
    setTimeout(function() { 
      console.log('[Rank Page] 开始请求', type, '榜数据...');
      that.getRanking(); 
    }, 100);
  },

  getRanking: function() {
    var that = this;
    var currentType = this.data.rankType;
    
    console.log('\n[Rank Page] ====== getRanking 开始 ======');
    console.log('[Rank Page] 当前类型:', currentType);
    console.log('[Rank Page] 当前时间:', new Date().toISOString());
    
    this.setData({ isLoading: true });

    wx.cloud.callFunction({
      name: 'getRanking',
      data: { type: currentType },
      success: function(res) {
        console.log('[Rank Page] getRanking response:', JSON.stringify(res.result));
        
        if (res.result && res.result.success) {
          var rawList = res.result.data;

          console.log('[Rank Page] 原始数据长度:', rawList ? rawList.length : 'null/undefined');
          console.log('[Rank Page] 数据来源信息:', res.result.type, '- 时间戳:', res.result.timestamp);

          if (!rawList || !Array.isArray(rawList) || rawList.length === 0) {
            console.log('[Rank Page] ✅', currentType, '返回空数据 - 应该显示空状态提示');
            that.setData({ 
              ranking: [], 
              pagedRanking: [],
              isLoading: false, 
              currentUserRank: null,
              currentPage: 1,
              totalPages: 1
            });
            return;
          }

          console.log('[Rank Page] 开始处理', rawList.length, '条原始数据...');

          var ranking = [];
          for (var ri = 0; ri < rawList.length; ri++) {
            var ritem = rawList[ri];

            if (!ritem._openid) {
              console.log('[Rank Page] ⚠️ 跳过无效数据项（缺少_openid）:', ritem);
              continue;
            }

            var st = ritem.studyTime || 0;
            if (typeof st !== 'number') { st = Number(st) || 0; }

            console.log('[Rank Page] 处理数据项', (ri + 1), '/', rawList.length, ':', ritem._openid, '- 类型:', currentType, '- studyTime:', st);

            if (st <= 0) {
              console.log('[Rank Page] ⚠️ 跳过无效数据项（学习时长<=0）:', ritem._openid);
              continue;
            }

            ritem.formattedTime = that.formatTime(st);
            ritem.rank = ranking.length + 1;
            ranking.push(ritem);
          }

          console.log('[Rank Page] ✅', currentType, '处理完成，有效数据:', ranking.length, '条');

          var currentUserOpenid = that.data.currentUserOpenid;
          var currentUserRank = null;
          
          if (currentUserOpenid && ranking.length > 0) {
            for (var i = 0; i < ranking.length; i++) {
              var item = ranking[i];
              if (item._openid === currentUserOpenid) {
                currentUserRank = item;
                console.log('[Rank Page] ✅ 找到当前用户排名: #', currentUserRank.rank);
                break;
              }
            }
          } else if (!currentUserOpenid) {
            console.log('[Rank Page] ℹ️ 未登录，跳过当前用户排名查找');
          }

          var pageSize = that.data.pageSize;
          var totalPages = Math.max(1, Math.ceil(ranking.length / pageSize));
          var currentPage = 1;
          var pagedRanking = ranking.slice((currentPage - 1) * pageSize, currentPage * pageSize);
          
          console.log('[Rank Page] 分页信息 - 总数:', ranking.length, '- 每页:', pageSize, '- 总页数:', totalPages, '- 当前页:', currentPage);
          
          that.setData({
            ranking: ranking,
            pagedRanking: pagedRanking,
            currentPage: currentPage,
            totalPages: totalPages,
            currentUserRank: currentUserRank,
            isLoading: false
          });
          
          console.log('[Rank Page] ✅ 数据已更新到页面');

        } else {
          console.log('[Rank Page] ❌ getRanking 返回失败:', res.result);
          that.setData({ 
            isLoading: false, 
            ranking: [],
            pagedRanking: []
          });
        }
      },
      fail: function(err) {
        console.error('[Rank Page] ❌ getRanking 请求失败:', err);
        that.setData({ 
          isLoading: false, 
          ranking: [],
          pagedRanking: []
        });
        wx.showToast({ 
          title: that.data.i18n.getRankFailed, 
          icon: 'none',
          duration: 2000
        });
      }
    });
  },

  refreshRanking: function() {
    console.log('[Rank Page] 🔄 用户手动刷新排行榜');
    wx.showLoading({ title: this.data.i18n.refreshing });
    this.getRanking();
    var that = this;
    setTimeout(function() {
      wx.hideLoading();
      wx.showToast({ title: that.data.i18n.refreshSuccess, icon: 'success' });
    }, 500);
  },

  formatTime: function(seconds) {
    if (!seconds || typeof seconds !== 'number') return '00:00:00';
    var hours = Math.floor(seconds / 3600);
    var minutes = Math.floor((seconds % 3600) / 60);
    var secs = seconds % 60;
    var hh = hours.toString(); var mm = minutes.toString(); var ss = secs.toString();
    if (hh.length < 2) hh = '0' + hh;
    if (mm.length < 2) mm = '0' + mm;
    if (ss.length < 2) ss = '0' + ss;
    return hh + ':' + mm + ':' + ss;
  },

  getRankClass: function(rank) {
    if (rank === 1) return 'rank-first';
    if (rank === 2) return 'rank-second';
    if (rank === 3) return 'rank-third';
    return 'rank-other';
  },

  onAvatarError: function(e) {
    var index = e.currentTarget.dataset.index;
    var ranking = this.data.ranking;
    if (ranking && ranking[index]) {
      ranking[index].avatarError = true;
      this.setData({ ranking: ranking });
    }
  },

  refreshExpiredAvatars: function() {
    var app = getApp();
    var currentUserInfo = app.globalData.userInfo || {};
    var ranking = this.data.ranking;
    if (!ranking || ranking.length === 0) return;
    var changed = false;
    for (var i = 0; i < ranking.length; i++) {
      if (ranking[i]._openid === currentUserInfo._openid && currentUserInfo.avatarUrl) {
        if (ranking[i].avatarUrl !== currentUserInfo.avatarUrl) {
          ranking[i].avatarUrl = currentUserInfo.avatarUrl;
          ranking[i].avatarError = false;
          changed = true;
        }
      }
    }
    if (changed) {
      this.setData({ ranking: ranking });
    }
  },

  prevPage: function() {
    if (this.data.currentPage <= 1) return;
    this.setData({ currentPage: this.data.currentPage - 1 });
    this.updatePagedRanking();
  },

  nextPage: function() {
    if (this.data.currentPage >= this.data.totalPages) return;
    this.setData({ currentPage: this.data.currentPage + 1 });
    this.updatePagedRanking();
  },

  updatePagedRanking: function() {
    var d = this.data;
    var pagedRanking = d.ranking.slice((d.currentPage - 1) * d.pageSize, d.currentPage * d.pageSize);
    var emptyCount = Math.max(0, d.pageSize - pagedRanking.length);
    var emptySlots = [];
    for (var i = 0; i < emptyCount; i++) {
      emptySlots.push(i);
    }
    this.setData({ pagedRanking: pagedRanking, emptySlots: emptySlots });
  },

  getMessages: function() {
    var that = this;
    that.setData({ isLoadingMessages: true });
    var db = wx.cloud.database();
    var now = new Date();
    var weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1);
    weekStart.setHours(0, 0, 0, 0);
    var currentOpenid = that.data.currentUserOpenid;
    var app = getApp();
    var currentUserInfo = app.globalData.userInfo || {};

    db.collection('messages').where({
      createdAt: db.command.gte(weekStart)
    }).orderBy('likeCount', 'desc').orderBy('createdAt', 'desc').limit(50).get({
      success: function(res) {
        var rawData = res.data || [];
        var messages = [];
        for (var i = 0; i < rawData.length; i++) {
          var item = rawData[i];
          var likedBy = item.likedBy || [];
          var isLiked = currentOpenid && likedBy.indexOf(currentOpenid) !== -1;

          var displayNickName = item.nickName || that.data.i18n.anonymousUser;
          var displayAvatarUrl = item.avatarUrl || '';
          if (item.userId === currentOpenid && currentUserInfo._openid) {
            displayNickName = currentUserInfo.nickName || that.data.i18n.anonymousUser;
            displayAvatarUrl = currentUserInfo.avatarUrl || '';
          }

          messages.push({
            _id: item._id,
            content: item.content,
            userId: item.userId,
            nickName: displayNickName,
            avatarUrl: displayAvatarUrl,
            likeCount: item.likeCount || 0,
            likedBy: likedBy,
            isLiked: isLiked,
            createdAt: item.createdAt,
            formattedDate: that.formatMessageDate(item.createdAt)
          });
        }
        that.setData({ messages: messages, isLoadingMessages: false });
      },
      fail: function(err) {
        console.error('获取留言失败:', err);
        that.setData({ isLoadingMessages: false });
      }
    });
  },

  formatMessageDate: function(date) {
    if (!date) return '';
    var d = new Date(date);
    var mo = d.getMonth() + 1; var day = d.getDate();
    var hr = d.getHours(); var min = d.getMinutes();
    var mos = mo.toString(); var ds = day.toString(); var hrs = hr.toString(); var mins = min.toString();
    if (mos.length < 2) mos = '0' + mos;
    if (ds.length < 2) ds = '0' + ds;
    if (hrs.length < 2) hrs = '0' + hrs;
    if (mins.length < 2) mins = '0' + mins;
    return mos + '-' + ds + ' ' + hrs + ':' + mins;
  },

  toggleMessageInput: function() {
    var app = getApp();
    if (!app.globalData.userInfo) {
      wx.showModal({
        title: that.data.i18n.tip,
        content: that.data.i18n.loginToMessage,
        success: function(res) {
          if (res.confirm) { wx.switchTab({ url: '/pages/mine/mine' }); }
        }
      });
      return;
    }
    this.setData({ showMessageInput: !this.data.showMessageInput, messageContent: '' });
  },

  onMessageInput: function(e) {
    this.setData({ messageContent: e.detail.value });
  },

  submitMessage: function() {
    var that = this;
    var content = this.data.messageContent.trim();
    if (!content) {
      wx.showToast({ title: this.data.i18n.inputMessage, icon: 'none' });
      return;
    }
    if (content.length > 200) {
      wx.showToast({ title: this.data.i18n.messageTooLong, icon: 'none' });
      return;
    }

    var app = getApp();
    if (!app.globalData.userInfo) return;

    this.setData({ isSubmittingMessage: true });
    wx.cloud.callFunction({
      name: 'reserveSeat',
      data: {
        action: 'addMessage',
        content: content,
        userInfo: {
          userId: app.globalData.userInfo._openid,
          nickName: app.globalData.userInfo.nickName,
          avatarUrl: app.globalData.userInfo.avatarUrl
        }
      },
      success: function(res) {
        that.setData({ isSubmittingMessage: false, showMessageInput: false, messageContent: '' });
        if (res.result && res.result.success) {
          wx.showToast({ title: that.data.i18n.messageSuccess, icon: 'success' });
          that.getMessages();
        } else {
          wx.showToast({ title: res.result.error || that.data.i18n.messageFailed, icon: 'none' });
        }
      },
      fail: function(err) {
        that.setData({ isSubmittingMessage: false });
        console.error('留言失败:', err);
        wx.showToast({ title: that.data.i18n.messageFailedRetry, icon: 'none' });
      }
    });
  },

  likeMessage: function(e) {
    var that = this;
    var messageId = e.currentTarget.dataset.id;
    var app = getApp();
    if (!app.globalData.userInfo) {
      wx.showModal({
        title: that.data.i18n.tip,
        content: that.data.i18n.loginToLike,
        success: function(res) {
          if (res.confirm) { wx.switchTab({ url: '/pages/mine/mine' }); }
        }
      });
      return;
    }

    var messages = this.data.messages;
    var targetMsg = null;
    for (var i = 0; i < messages.length; i++) {
      if (messages[i]._id === messageId) {
        targetMsg = messages[i];
        break;
      }
    }
    if (!targetMsg) return;

    var currentOpenid = app.globalData.userInfo._openid;
    var likedBy = targetMsg.likedBy || [];
    var alreadyLiked = likedBy.indexOf(currentOpenid) !== -1;

    wx.cloud.callFunction({
      name: 'reserveSeat',
      data: {
        action: 'likeMessage',
        messageId: messageId,
        userId: currentOpenid,
        unlike: alreadyLiked
      },
      success: function(res) {
        if (res.result && res.result.success) {
          if (alreadyLiked) {
            targetMsg.likeCount = Math.max(0, (targetMsg.likeCount || 0) - 1);
            targetMsg.likedBy = likedBy.filter(function(id) { return id !== currentOpenid; });
            targetMsg.isLiked = false;
          } else {
            targetMsg.likeCount = (targetMsg.likeCount || 0) + 1;
            targetMsg.likedBy = likedBy.concat([currentOpenid]);
            targetMsg.isLiked = true;
          }
          that.setData({ messages: messages });
        }
      },
      fail: function(err) {
        console.error('点赞操作失败:', err);
      }
    });
  },

  deleteMessage: function(e) {
    var that = this;
    var messageId = e.currentTarget.dataset.id;
    var app = getApp();
    if (!app.globalData.userInfo) {
      wx.showToast({ title: this.data.i18n.loginFirst, icon: 'none' });
      return;
    }

    wx.showModal({
      title: that.data.i18n.confirmDelete,
      content: that.data.i18n.confirmDeleteContent,
      confirmText: that.data.i18n.deleteText,
      confirmColor: '#EF4444',
      success: function(res) {
        if (res.confirm) {
          wx.cloud.callFunction({
            name: 'reserveSeat',
            data: {
              action: 'deleteMessage',
              messageId: messageId,
              userId: app.globalData.userInfo._openid
            },
            success: function(res) {
              if (res.result && res.result.success) {
                wx.showToast({ title: that.data.i18n.deleteSuccess, icon: 'success' });
                that.getMessages();
              } else {
                wx.showToast({ title: res.result.error || that.data.i18n.deleteFailed, icon: 'none' });
              }
            },
            fail: function(err) {
              console.error('删除留言失败:', err);
              wx.showToast({ title: that.data.i18n.deleteFailedRetry, icon: 'none' });
            }
          });
        }
      }
    });
  }
});
