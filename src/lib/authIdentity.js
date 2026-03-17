/**
 * 统一清洗手机号：去掉非数字、前缀 86、前导 0
 * @param {string|number|null|undefined} phone
 * @returns {string}
 */
export function normalizeCNPhone(phone) {
  return String(phone ?? '')
    .replace(/\D/g, '')
    .replace(/^86/, '')
    .replace(/^0+/, '')
}

/**
 * 判断是否为 11 位大陆手机号（1 开头）
 * @param {string} normalizedPhone
 * @returns {boolean}
 */
export function isValidCNPhone11(normalizedPhone) {
  return /^1\d{10}$/.test(normalizedPhone)
}

/**
 * 将手机号映射为 Auth 邮箱身份
 * @param {string|number|null|undefined} phone
 * @returns {{ normalizedPhone: string, email: string, isValid: boolean }}
 */
export function phoneToAuthIdentity(phone) {
  const normalizedPhone = normalizeCNPhone(phone)
  return {
    normalizedPhone,
    email: `${normalizedPhone}@fitness.app`,
    isValid: isValidCNPhone11(normalizedPhone)
  }
}
