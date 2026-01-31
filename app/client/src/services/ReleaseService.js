import Api from './Api'

const service = {
  getReleaseNotes() {
    return Api().get('/api/release-notes')
  },
  setLastSeenVersion(version) {
    return Api().put('/api/user/last-seen-version', { version })
  },
}

export default service
