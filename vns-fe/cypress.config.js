const { defineConfig } = require("cypress");

module.exports = defineConfig({
  e2e: {
    baseUrl: "http://localhost:3000",
    viewportWidth: 1280,
    viewportHeight: 720,
    defaultCommandTimeout: 10000,
    video: false,
    screenshotOnRunFailure: false,
    env: {
      apiUrl: "http://localhost:5272",
    },
    setupNodeEvents(on, config) {},
  },
});
