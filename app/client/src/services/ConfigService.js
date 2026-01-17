import Api from './Api'

const service = {
  getConfig() {
    return Api().get('/api/config')
  },
  getAdminConfig() {
    return Api().get('/api/admin/config')
  },
  updateConfig(config) {
    return Api().put('/api/admin/config', {
      config,
    })
  },
  resetDatabase(options) {
    const payload = options ? { options } : undefined
    return Api().post('/api/admin/reset-database', payload)
  },
}

export default service
