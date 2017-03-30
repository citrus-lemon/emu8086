const emu8086 = require('../lib/core.js')

a = new emu8086();
a.memory_assign(0,12345,1)
console.log(
a.memory(0),
a.memory(0,1),
a.memory(1)
)
a.memory_assign(1,12)
console.log(
a.memory(0),
a.memory(0,1),
a.memory(1)
)
a.register_assign("AL",2)
a.register_assign("BH",4)
a.register_assign("CX",10)
a.register_assign("DH",1400)
console.log(
  a.register("AX")
)
console.log(a.register_list)
a.flag_assign("CF",1)
a.flag_assign("ZF",true)
a.flag_assign("oF",true)
a.flag_assign("sf",false)
a.register_assign("FLAGH",12)
console.log(
  a.flag(),
  a.flag("H")
  )

console.log('end')
console.log(a.DataEle.reg())
