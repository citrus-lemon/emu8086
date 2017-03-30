const cpu = require('../lib/core.js')

let a = new cpu()
a.loadCode([0x89,0xd8])
a.register_assign("AX",2)
a.register_assign("bx",4)
a.step()
console.log(
  a.register("ax"),
  a.register("bx")
)
