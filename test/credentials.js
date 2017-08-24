if (process.env.SCREEPS_USER && process.env.SCREEPS_PASS) {
    module.exports = {
      email: process.env.SCREEPS_USER,
      password: process.env.SCREEPS_PASS
    }
} else {
    module.exports = require("../auth.js")
}