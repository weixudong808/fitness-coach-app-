import { ElMessageBox, ElMessage } from 'element-plus'

/**
 * 选择课次状态（已完成/待训练）
 * @param {string} trainingDate - 训练日期 (YYYY-MM-DD)
 * @returns {Promise<{completed: boolean, date: string|null}|null>}
 *          - 返回状态对象：{ completed: true/false, date: '2026-03-04'/null }
 *          - 返回 null：用户取消了操作
 */
export const selectSessionStatus = async (trainingDate) => {
  try {
    await ElMessageBox.confirm(
      '请选择课次状态',
      '保存课次',
      {
        distinguishCancelAndClose: true,
        confirmButtonText: '已完成',
        cancelButtonText: '待训练',
        confirmButtonClass: 'el-button--success',
        cancelButtonClass: 'el-button--info',
        type: 'info'
      }
    )
    // 用户点击"已完成"
    // 验证训练日期是否是未来日期
    if (trainingDate) {
      const today = new Date()
      today.setHours(0, 0, 0, 0) // 设置为当天0点，只比较日期
      const trainingDateObj = new Date(trainingDate)
      trainingDateObj.setHours(0, 0, 0, 0)

      if (trainingDateObj > today) {
        // 训练日期是未来日期，不能标记为已完成
        ElMessage.error(`训练日期是未来日期（${trainingDate}），不能标记为已完成，请选择"待训练"`)
        return null // 阻止保存
      }
    }

    return {
      completed: true,
      date: new Date().toISOString().split('T')[0]
    }
  } catch (action) {
    if (action === 'cancel') {
      // 用户点击"待训练"
      return {
        completed: false,
        date: null
      }
    }
    // 用户点击关闭按钮或按 ESC
    return null
  }
}
