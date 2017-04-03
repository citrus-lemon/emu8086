const fs = require('fs')
const {CPU , debug} = require('../index.js')

const code = fs.readFileSync('./test/codegolf.8086')

let d = new debug()
d.load(code)

d.onevent("init",(self) => {
  self.register_assign("SP",0x100)
})

d.onevent("stepdone",(self,code) => {
  // console.log(`${self.steptimes}: ${code.addr.toString(16)} ${code.command} ${code.args && (code.args.map((e) => e.toString(16)).join(','))}`)

  console.log(`${self.steptimes}\t${code.command}\t${["AX", "BX", "CX", "DX", "SI", "DI", "BP", "SP"].map((e) => (self.register(e))).join("\t")}`)
})

global.cpu = d

d.run()

console.log('end')
