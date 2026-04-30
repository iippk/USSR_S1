// 云函数入口文件 - 初始化座位 & 获取座位
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const seatsCollection = db.collection('seats')
const configCollection = db.collection('system_config')

exports.main = async (event, context) => {
  const action = event.action

  // ================= 新增：获取全部座位逻辑 =================
  if (action === 'getSeats') {
    try {
      const res = await seatsCollection.limit(1000).get()
      return { success: true, data: res.data }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  if (action === 'fixZoneData') {
    try {
      const allSeats = await seatsCollection.limit(1000).get()
      const seats = allSeats.data
      var fixedCount = 0
      for (var i = 0; i < seats.length; i++) {
        var seat = seats[i]
        var row = seat.row
        var zoneKey = 'immersive'
        if (row >= 1 && row <= 3) zoneKey = 'immersive'
        else if (row >= 4 && row <= 5) zoneKey = 'sunshine'
        else if (row === 6) zoneKey = 'vip'

        if (seat.zoneKey !== zoneKey) {
          await seatsCollection.doc(seat._id).update({ data: { zoneKey: zoneKey } })
          fixedCount++
        }
      }
      return { success: true, message: '修复完成，更新了 ' + fixedCount + ' 个座位', fixedCount: fixedCount }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  if (action === 'fixSeatPosition') {
    try {
      const allSeats = await seatsCollection.limit(1000).get()
      const seats = allSeats.data
      var fixedCount = 0
      for (var i = 0; i < seats.length; i++) {
        var seat = seats[i]
        if (!seat.seatNumber) continue
        var parts = seat.seatNumber.split('-')
        if (parts.length !== 2) continue
        var correctRow = parseInt(parts[0], 10)
        var correctCol = parseInt(parts[1], 10)
        if (isNaN(correctRow) || isNaN(correctCol)) continue

        var needFix = false
        var updateData = {}

        if (seat.row !== correctRow) {
          updateData.row = correctRow
          needFix = true
        }
        if (seat.col !== correctCol) {
          updateData.col = correctCol
          needFix = true
        }

        var zoneKey = 'immersive'
        if (correctRow >= 1 && correctRow <= 3) zoneKey = 'immersive'
        else if (correctRow >= 4 && correctRow <= 5) zoneKey = 'sunshine'
        else if (correctRow === 6) zoneKey = 'vip'

        if (seat.zoneKey !== zoneKey) {
          updateData.zoneKey = zoneKey
          needFix = true
        }

        if (needFix) {
          await seatsCollection.doc(seat._id).update({ data: updateData })
          fixedCount++
          console.log('修复座位:', seat.seatNumber, 'row:', correctRow, 'col:', correctCol, 'zoneKey:', zoneKey)
        }
      }
      return { success: true, message: '修复完成，更新了 ' + fixedCount + ' 个座位的位置数据', fixedCount: fixedCount }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  // ================= 修改：初始化座位逻辑 =================
  try {
    console.log('开始初始化座位数据...')
    
    // 从系统配置获取行数和列数
    const config = await configCollection.doc('seatConfig').get()
    const seatConfig = config.data || {}
    const rows = seatConfig.rows || 6 // 默认6行
    const cols = seatConfig.cols || 8 // 默认8列
    const expectedTotal = rows * cols
    
    console.log('系统配置 - 行数:', rows, '列数:', cols)
    console.log('预期总座位数:', expectedTotal)

    const existingSeats = await seatsCollection.count()
    console.log('现有座位数量:', existingSeats.total)
    
    if (existingSeats.total > 0) {
      console.log('座位数据已存在，检查是否完整...')
      const allSeats = await seatsCollection.limit(1000).get()
      const seats = allSeats.data
      
      const actualRows = [...new Set(seats.map(seat => seat.row))]
      console.log('现有行数:', actualRows.length)
      
      let isComplete = (seats.length === expectedTotal);
      
      if (isComplete) {
        for (let row = 1; row <= rows; row++) {
          const rowSeats = seats.filter(seat => seat.row === row)
          if (rowSeats.length !== cols) {
            console.log(`第${row}行座位数量不正确: ${rowSeats.length}`)
            isComplete = false
            break;
          }
        }
      }
      
      if (isComplete) {
        return {
          success: true,
          message: `座位数据已完整，共 ${existingSeats.total} 个座位，无需重复初始化`,
          seatCount: existingSeats.total
        }
      } else {
        console.log('座位数据不完整或被截断，需要清空并重新初始化...')
        if (seats.length > 0) {
          const deletePromises = seats.map(seat => seatsCollection.doc(seat._id).remove())
          await Promise.all(deletePromises)
          console.log(`已清空不完整的 ${seats.length} 个座位数据`)
        }
      }
    }
    
    console.log('开始创建新的座位数据...')
    const newSeats = []
    
    for (let row = 1; row <= rows; row++) {
      var zoneKey = 'immersive'
      if (row >= 1 && row <= 3) zoneKey = 'immersive'
      else if (row >= 4 && row <= 5) zoneKey = 'sunshine'
      else if (row === 6) zoneKey = 'vip'

      for (let col = 1; col <= cols; col++) {
        newSeats.push({
          seatNumber: `${row}-${col}`,
          row: row,
          col: col,
          zoneKey: zoneKey,
          status: '空闲',
          userId: null,
          remainingTime: 0,
          autoReleaseAt: null,
          startedAt: null,
          plan: null,
          createdAt: db.serverDate(),
          updatedAt: db.serverDate(),
          hardwareStatus: {
            light: false,
            airConditioner: false,
            door: false
          }
        })
      }
    }
    
    console.log('准备添加座位数据:', newSeats.length, '个座位')
    
    try {
      await seatsCollection.add({ data: newSeats })
      console.log('座位数据初始化完成')
      return {
        success: true,
        message: `成功初始化 ${newSeats.length} 个座位`,
        seatCount: newSeats.length
      }
    } catch (batchError) {
      console.error('批量添加座位失败:', batchError)
      throw batchError
    }
    
  } catch (error) {
    console.error('初始化座位失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
}
