import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: 'sow12t1i',
    dataset: 'production'
  },
<<<<<<< Updated upstream
  // 这是终端刚刚分配给你的专属 appId
  deployment: {
    appId: 's606sqnlvdi75x8uwww5vwu0'
  },
  autoUpdates: true
})
=======
  deployment: {
    /**
     * Enable auto-updates for studios.
     * Learn more at https://www.sanity.io/docs/studio/latest-version-of-sanity#k47faf43faf56
     */
    autoUpdates: true,
  }
})
>>>>>>> Stashed changes
