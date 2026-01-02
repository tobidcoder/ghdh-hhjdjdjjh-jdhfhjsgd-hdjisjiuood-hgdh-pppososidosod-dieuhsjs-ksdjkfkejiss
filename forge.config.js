module.exports = {
  // ...
  packagerConfig: {
    icon: '/resources/favicon' // no file extension required
  },
  // ...
  publishers: [
    {
      name: '@electron-forge/publisher-github',
      config: {
        repository: {
          owner: 'me',
          name: 'awesome-thing'
        },
        prerelease: true
      }
    }
  ]
}
