import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: 'sow12t1i',
    dataset: 'production'
  },
  // 这是终端刚刚分配给你的专属 appId
  deployment: {
    appId: 's606sqnlvdi75x8uwww5vwu0'
  },
  autoUpdates: true
})