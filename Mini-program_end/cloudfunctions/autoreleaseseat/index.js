const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const seatReleaseLogs = db.collection('seat_release_logs')

exports.main = async (event, context) => {
  const now = new Date()

  const isTimerTrigger = event && (event.Type === 'timer' || event.TriggerName === 'autoReleaseTimer')

  console.log('========================================')
  console.log('🚀 [自动释放] 云函数开始执行')
  console.log('⏰ [自动释放] 当前时间:', now.toISOString())
  console.log('📅 [自动释放] 时间戳:', now.getTime())
  console.log('📥 [自动释放] 接收参数:', JSON.stringify(event))
  if (isTimerTrigger) {
    console.log('⏱️ [自动释放] ★ 触发方式：定时触发器（服务端自动执行）')
  } else {
    console.log('👤 [自动释放] 触发方式：前端调用')
  }
  console.log('========================================')

  try {

    if (event && event.forceReleaseSeatId) {
      console.log('\n🎯 [自动释放] 检测到强制释放请求，座位ID:', event.forceReleaseSeatId)
      return await forceReleaseSpecificSeat(event.forceReleaseSeatId, now)
    }

    const logEntry = {
      action: isTimerTrigger ? 'timer_auto_release_check_start' : 'manual_auto_release_check_start',
      triggerType: isTimerTrigger ? 'timer' : 'manual',
      executedAt: now,
      status: 'started',
      message: isTimerTrigger ? '定时触发器开始检查' : '手动调用开始检查'
    }
    try { await seatReleaseLogs.add({ data: logEntry }) } catch (logErr) { console.error('写入启动日志失败:', logErr.message) }

    console.log('\n📋 第1步：查询所有"使用中"的座位...')

    let allSeats = []
    let hasMore = true
    let skipCount = 0
    const batchSize = 100

    while (hasMore) {
      const batchResult = await db.collection('seats').where({
        status: '使用中'
      }).skip(skipCount).limit(batchSize).get()

      if (batchResult.data && batchResult.data.length > 0) {
        allSeats = allSeats.concat(batchResult.data)
        skipCount += batchResult.data.length

        if (batchResult.data.length < batchSize) {
          hasMore = false
        }
      } else {
        hasMore = false
      }
    }
    
    console.log('[自动释放] 找到使用中的座位总数:', allSeats.length)

    if (allSeats.length === 0) {
      console.log('\n✅ [自动释放] 没有"使用中"的座位，无需处理')
      return {
        success: true,
        message: '没有使用中的座位',
        totalSeats: 0,
        releasedCount: 0,
        executedAt: now.toISOString(),
        triggerType: isTimerTrigger ? 'timer' : 'manual'
      }
    }

    // 第2步：逐个检查每个座位的订单过期时间
    let releasedCount = 0
    const details = []

    console.log('\n📋 第2步：检查每个座位的订单过期时间...')

    for (const seat of allSeats) {
      const detail = {
        seatNumber: seat.seatNumber,
        userId: seat.userId,
        orderId: seat.orderId || '(无)'
      }
      
      console.log(`\n� 检查座位: ${seat.seatNumber}`)
      console.log(`   座位ID: ${seat._id}`)
      console.log(`   用户ID: ${seat.userId}`)
      console.log(`   订单ID: ${seat.orderId || '(无)'}`)

      // 如果没有订单ID，跳过这个座位
      if (!seat.orderId) {
        console.log(`   ⚠️ 该座位没有关联的订单，跳过`)
        detail.error = '没有关联的订单(orderId)'
        detail.isExpired = false
        detail.willRelease = false
        details.push(detail)
        continue
      }

      // 查询订单信息
      console.log(`   正在查询订单: ${seat.orderId}...`)
      try {
        const orderResult = await db.collection('orders').doc(seat.orderId).get()
        const order = orderResult.data
        
        if (!order) {
          console.log(`   ⚠️ 订单不存在: ${seat.orderId}`)
          detail.error = '订单不存在'
          detail.isExpired = false
          detail.willRelease = false
          details.push(detail)
          continue
        }

        console.log(`   ✅ 订单查询成功`)
        console.log(`   订单状态: ${order.status}`)
        console.log(`   订单到期时间: ${order.expireAt}`)

        // 用订单的expireAt来判断是否过期
        if (!order.expireAt) {
          console.log(`   ⚠️ 订单没有expireAt字段`)
          detail.error = '订单缺少expireAt字段'
          detail.isExpired = false
          detail.willRelease = false
          details.push(detail)
          continue
        }

        const expireTime = new Date(order.expireAt)
        const isExpired = expireTime.getTime() <= now.getTime()
        const timeDiff = Math.floor((expireTime.getTime() - now.getTime()) / 1000)
        
        detail.orderExpireAt = expireTime.toISOString()
        detail.orderStatus = order.status
        detail.timeDiffSeconds = timeDiff
        detail.isExpired = isExpired
        detail.willRelease = isExpired

        console.log(`   订单解析后的时间: ${expireTime.toISOString()}`)
        console.log(`   剩余时间: ${timeDiff}秒 (${Math.floor(timeDiff/60)}分钟)`)
        console.log(`   是否过期: ${isExpired ? '🔴 YES - 需要释放!' : '✅ NO'}`)

        if (isExpired) {
          console.log(`   🚨 订单已过期！开始释放座位...`)

          const releaseLog = {
            action: 'seat_release_attempt',
            seatId: seat._id,
            seatNumber: seat.seatNumber,
            userId: seat.userId,
            orderId: seat.orderId,
            orderExpireAt: expireTime.toISOString(),
            executedAt: now,
            status: 'attempting',
            message: `尝试释放座位 ${seat.seatNumber}，订单已于 ${expireTime.toISOString()} 过期`
          }

          try {

            const currentSeatCheck = await db.collection('seats').doc(seat._id).get()
            if (!currentSeatCheck.data || currentSeatCheck.data.status !== '使用中') {
              console.log(`   ⚠️ 座位状态已变更，跳过释放（当前状态: ${currentSeatCheck.data ? currentSeatCheck.data.status : '不存在'}）`)
              releaseLog.status = 'skipped'
              releaseLog.message = `座位状态已变更为 ${currentSeatCheck.data ? currentSeatCheck.data.status : '不存在'}，跳过释放`
              try { await seatReleaseLogs.add({ data: releaseLog }) } catch (logErr2) { console.error('写入跳过日志失败:', logErr2.message) }
              detail.willRelease = false
              detail.released = false
              detail.skipped = true
              detail.skipReason = '座位状态已变更'
              details.push(detail)
              continue
            }
            // 执行释放操作
            const updateData = {
              status: '空闲',
              userId: '',
              reservedAt: null,
              startedAt: null,
              remainingTime: 0,
              autoReleaseAt: null,
              expireAt: null,
              hardwareStatus: { light: false, airConditioner: false, door: false },
              updatedAt: now
            }
            
            await db.collection('seats').doc(seat._id).update({
              data: updateData
            })
            
            console.log(`   ✅ 座位状态已更新为"空闲"`)

            // 更新订单状态为已完成
            try {
              await db.collection('orders').doc(seat.orderId).update({
                data: {
                  status: 'completed',
                  completedAt: now,
                  autoReleased: true,
                  updatedAt: now
                }
              })
              console.log(`   ✅ 订单状态已更新为"completed"`)
            } catch (orderUpdateError) {
              console.error(`   ⚠️ 更新订单状态失败:`, orderUpdateError.message)
            }

            // 如果有学习记录需要保存
            if (seat.startedAt && seat.userId) {
              const startTime = new Date(seat.startedAt)
              const durationSeconds = Math.floor((now.getTime() - startTime.getTime()) / 1000)
              
              if (durationSeconds > 0) {
                try {
                  await db.collection('study_records').add({
                    data: {
                      userId: seat.userId,
                      seatId: seat._id,
                      seatNumber: seat.seatNumber,
                      startTime: startTime,
                      endTime: now,
                      duration: durationSeconds,
                      status: 'completed',
                      createdAt: now,
                      updatedAt: now
                    }
                  })
                  console.log(`   📝 学习记录已保存, 时长: ${durationSeconds}秒`)
                  
                  // 更新用户的总学习时长
                  try {
                    await db.collection('users').where({
                      _openid: seat.userId
                    }).update({
                      data: {
                        totalStudyTime: db.command.inc(durationSeconds),
                        updatedAt: now
                      }
                    })
                    console.log(`   📊 用户总学习时长已更新`)
                  } catch (userUpdateError) {
                    console.error(`   ⚠️ 更新用户学习时长失败:`, userUpdateError.message)
                  }
                } catch (recordError) {
                  console.error(`   ⚠️ 保存学习记录失败:`, recordError.message)
                }
              }
            }

            releasedCount++
            detail.released = true
            detail.releasedAt = now.toISOString()
            console.log(`   ✅✅✅ 座位 ${seat.seatNumber} 完整释放成功！`)

            releaseLog.status = 'success'
            releaseLog.message = `座位 ${seat.seatNumber} 成功释放，学习时长: ${durationSeconds || 0}秒`
            releaseLog.releasedAt = now.toISOString()
            releaseLog.studyDurationSeconds = durationSeconds || 0
            try { await seatReleaseLogs.add({ data: releaseLog }) } catch (logErr3) { console.error('写入成功日志失败:', logErr3.message) }
            
          } catch (releaseError) {
            detail.released = false
            detail.error = releaseError.message
            console.error(`   ❌ 释放座位失败:`, releaseError.message)

            releaseLog.status = 'failed'
            releaseLog.message = `座位 ${seat.seatNumber} 释放失败: ${releaseError.message}`
            releaseLog.error = releaseError.message
            try { await seatReleaseLogs.add({ data: releaseLog }) } catch (logErr4) { console.error('写入失败日志失败:', logErr4.message) }
          }
        } else {
          console.log(`   ✅ 订单未过期，座位保持使用状态`)
        }
        
      } catch (orderQueryError) {
        detail.error = `查询订单失败: ${orderQueryError.message}`
        detail.isExpired = false
        detail.willRelease = false
        console.error(`   ❌ 查询订单失败:`, orderQueryError.message)
      }
      
      details.push(detail)
    }

    // 返回详细结果
    const result = {
      success: true,
      message: `检查完成，共检查 ${allSeats.length} 个座位，释放了 ${releasedCount} 个`,
      totalSeats: allSeats.length,
      releasedCount: releasedCount,
      details: details,
      executedAt: now.toISOString(),
      triggerType: isTimerTrigger ? 'timer' : 'manual',
      debugInfo: {
        timestamp: now.getTime(),
        currentTime: now.toISOString()
      }
    }

    console.log('\n========================================')
    console.log('🎉 [自动释放] 执行完成！')
    console.log(`   总使用中座位数: ${allSeats.length}`)
    console.log(`   已释放座位数: ${releasedCount}`)
    if (isTimerTrigger) {
      console.log('   ⏱️ 执行方式：定时触发器（服务端自动）')
    }
    console.log('========================================\n')

    const completionLog = {
      action: isTimerTrigger ? 'timer_auto_release_check_complete' : 'manual_auto_release_check_complete',
      triggerType: isTimerTrigger ? 'timer' : 'manual',
      executedAt: now,
      status: 'completed',
      totalSeatsChecked: allSeats.length,
      totalSeatsReleased: releasedCount,
      message: `检查完成，共检查 ${allSeats.length} 个座位，释放了 ${releasedCount} 个`
    }
    try { await seatReleaseLogs.add({ data: completionLog }) } catch (logErr5) { console.error('写入完成日志失败:', logErr5.message) }

    return result

  } catch (error) {
    console.error('========================================')
    console.error('❌ [自动释放] 执行出错！')
    console.error('错误信息:', error.message)
    console.error('错误堆栈:', error.stack)
    console.error('========================================')
    
    return {
      success: false,
      error: error.message,
      stack: error.stack,
      executedAt: now.toISOString()
    }
  }
}

async function forceReleaseSpecificSeat(seatId, now) {
  console.log('\n🎯 [强制释放] 开始强制释放座位:', seatId)

  try {
    const seatResult = await db.collection('seats').doc(seatId).get()

    if (!seatResult.data) {
      console.log('❌ [强制释放] 座位不存在:', seatId)
      return { success: false, error: '座位不存在', executedAt: now.toISOString() }
    }

    const seat = seatResult.data
    console.log('✅ [强制释放] 找到座位:', seat.seatNumber, '- 当前状态:', seat.status)

    if (seat.status !== '使用中') {
      console.log('⚠️ [强制释放] 座位状态不是"使用中"，当前状态:', seat.status)
      return { success: true, message: '座位已不在使用中', status: seat.status, executedAt: now.toISOString() }
    }

    let durationSeconds = 0
    if (seat.startedAt && seat.userId) {
      const startTime = new Date(seat.startedAt)
      durationSeconds = Math.floor((now.getTime() - startTime.getTime()) / 1000)

      if (durationSeconds > 0) {
        console.log('📝 [强制释放] 保存学习记录, 时长:', durationSeconds, '秒')
        try {
          await db.collection('study_records').add({
            data: {
              userId: seat.userId,
              seatId: seat._id,
              seatNumber: seat.seatNumber,
              startTime: startTime,
              endTime: now,
              duration: durationSeconds,
              status: 'completed',
              autoReleased: true,
              createdAt: now,
              updatedAt: now
            }
          })
          console.log('✅ [强制释放] 学习记录保存成功')

          try {
            await db.collection('users').where({
              _openid: seat.userId
            }).update({
              data: {
                totalStudyTime: db.command.inc(durationSeconds),
                updatedAt: now
              }
            })
            console.log('✅ [强制释放] 用户总学习时长更新成功')
          } catch (userUpdateError) {
            console.error('⚠️ [强制释放] 更新用户学习时长失败:', userUpdateError.message)
          }
        } catch (recordError) {
          console.error('❌ [强制释放] 保存学习记录失败:', recordError.message)
        }
      }
    }

    if (seat.orderId) {
      try {
        await db.collection('orders').doc(seat.orderId).update({
          data: {
            status: 'completed',
            completedAt: now,
            autoReleased: true,
            updatedAt: now
          }
        })
        console.log('✅ [强制释放] 订单状态更新为completed')
      } catch (orderUpdateError) {
        console.error('⚠️ [强制释放] 更新订单状态失败:', orderUpdateError.message)
      }
    }

    await db.collection('seats').doc(seatId).update({
      data: {
        status: '空闲',
        userId: '',
        reservedAt: null,
        startedAt: null,
        remainingTime: 0,
        autoReleaseAt: null,
        expireAt: null,
        hardwareStatus: { light: false, airConditioner: false, door: false },
        updatedAt: now
      }
    })

    console.log('✅✅✅ [强制释放] 座位', seat.seatNumber, '强制释放成功！')
    console.log('   📊 学习时长:', durationSeconds, '秒')

    try {
      await seatReleaseLogs.add({
        data: {
          action: 'force_release_success',
          seatId: seatId,
          seatNumber: seat.seatNumber,
          userId: seat.userId,
          orderId: seat.orderId,
          studyDurationSeconds: durationSeconds,
          executedAt: now,
          status: 'success',
          message: `强制释放座位 ${seat.seatNumber} 成功，学习时长: ${durationSeconds}秒`
        }
      })
    } catch (logErr) {
      console.error('⚠️ [强制释放] 写入日志失败:', logErr.message)
    }

    return {
      success: true,
      action: 'force_release',
      seatNumber: seat.seatNumber,
      studyDurationSeconds: durationSeconds,
      message: `座位 ${seat.seatNumber} 已成功释放，学习时长: ${durationSeconds}秒`,
      executedAt: now.toISOString()
    }

  } catch (error) {
    console.error('❌ [强制释放] 执行失败:', error.message)
    console.error('   堆栈:', error.stack)

    try {
      await seatReleaseLogs.add({
        data: {
          action: 'force_release_failed',
          seatId: seatId,
          executedAt: now,
          status: 'failed',
          error: error.message,
          message: `强制释放座位失败: ${error.message}`
        }
      })
    } catch (logErr2) {
      console.error('❌ [强制释放] 写入失败日志也失败:', logErr2.message)
    }

    return {
      success: false,
      error: error.message,
      executedAt: now.toISOString()
    }
  }
}
