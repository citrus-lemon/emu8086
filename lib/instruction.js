let instruction_set = []
function instruction_define(op,act) {
  let code = {
    match: [],
    par:   []
  }
  mark = op.replace(/\s/g,'')
  while (/{(\w+)}|([a-z])/.test(mark)) {
    let match = mark.match(/{(\w+)}|([a-z])/)
    let f = match[2] || match[1]
    let offset = match.index
    if (f.length == 1) {
      mark = mark.replace(match[0],'*')
      code.par.push({
        name: f,
        pos:  offset,
        len:  1
      })
    }
    else if (f == "mod" || f == "seg") {
      mark = mark.replace(match[0],'**')
      code.par.push({
        name: f,
        pos:  offset,
        len:  2
      })
    }
    else {
      mark = mark.replace(match[0],'***')
      code.par.push({
        name: f,
        pos:  offset,
        len:  3
      })
    }
  }
  if (mark.length % 8 == 0) {
    for (let i = 0; i < parseInt(mark.length / 8); i++) {
      let part = mark.slice(i*8,(i+1)*8)
      let mask = parseInt(part.replace(/\d/g,'1').replace(/\*/g,'0'),2)
      let ma = parseInt(part.replace(/\*/g,'0'),2)
      code.match.push({
        match: ma,
        mask: mask
      })
    }
    code.par.forEach(function(element) {
      element.ord = parseInt(element.pos / 8)
      element.pos = 7 - (element.pos % 8 + element.len - 1)
    }, this);
  }
  else {
    throw "error code"
  }
  code.act = act
  instruction_set.push(code)
}

function instruction_match(code) {
  let op = []
  let flag = false
  let pos = this.register("PC")
  for (let i = 0; i < instruction_set.length; i++) {
    let element = instruction_set[i];
    flag = true
    for (let b = 0; b < element.match.length; b++) {
      let s = element.match[b];
      if (!op[b]) {op.push(this.fetchb())}
      if ((op[b] & s.mask) != s.match) {
        flag = false
        break
      }
    }
    if (flag) {
      let code = element.act(
        element.par.map((e) => {
          return (op[e.ord] & (((1<<e.len) - 1) << e.pos)) >> e.pos
        }),
        this
      )
      code.addr = pos
      code.segment = this.register("DS")
      return code
    }
  }
  this.register_assign("PC", pos)
  return {
    run: () => {},
    addr: pos,
    segment: this.register("DS")
  }
}

instruction_define("1000 10dw {mod} {reg} {rm}", (e,cpu) => {
  // Register/Memory from/to Register
  let [d,w,mod,reg,rm] = e
  let src = cpu.DataEle.reg(reg,w)
  let obj = cpu.DataEle.r_mem(mod,rm,w)
  if (d) {[obj, src] = [src, obj]}
  return {
    command: "MOV",
    args: [ obj, src ],
    run: () => {obj.assign(src.data())}
  }
})
instruction_define("1100 011w {mod} 000 {rm}", (e,cpu) => {
  // Immediate to Register/Memory
  let [w,mod,rm] = e
  let obj = cpu.DataEle.r_mem(mod,rm,w)
  let src = cpu.DataEle.imm(cpu.fetch(w))
  return {
    command: "MOV",
    args: [ obj, src ],
    run: () => {obj.assign(src.data())}
  }
})

module.exports = {
  instruction_set: instruction_set,
  instruction: instruction_match
}
