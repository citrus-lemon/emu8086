const fs = require('fs')
const {CPU , debug} = require('../index.js')

const code = fs.readFileSync('./test/codegolf.8086')

let d = new debug()
d.load(code)

while (1) {
  d.step()
}
