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
instruction_define("1011 w{reg}", (e,cpu) => {
  // Immediate to Register
  let [w,reg] = e
  let obj = cpu.DataEle.reg(reg,w)
  let src = cpu.DataEle.imm(cpu.fetch(w))
  return {
    command: "MOV",
    args: [ obj, src ],
    run: () => {obj.assign(src.data())}
  }
})
instruction_define("1010 00dw", (e,cpu) => {
  let [d,w] = e
  let obj = cpu.DataEle.reg(0,w)
  let src = cpu.DataEle.mem(cpu.fetchw,"DS",w)
  if (d) {[obj, src] = [src, obj]}
  return {
    command: "MOV",
    args: [ obj, src ],
    run: () => {obj.assign(src.data())}
  }
})
instruction_define("1000 11d0 {mod} 0 {seg} {rm}", (e,cpu) => {
  let [d,mod,seg,rm] = e
  let obj = cpu.DataEle.r_mem(mod,rm,1)
  let src = cpu.DataEle.seg(seg)
  if (d) {[obj, src] = [src, obj]}
  return {
    command: "MOV",
    args: [ obj, src ],
    run: () => {obj.assign(src.data())}
  }
})

instruction_define("1111 1111 {mod} 110 {rm}", (e,cpu) => {
  let [mod,rm] = e
  let src = cpu.DataEle.r_mem(mod,rm,1)
  return {
    command: "PUSH",
    args: [src],
    run: () => {cpu.push(src)}
  }
})
instruction_define("0101 0{reg}", (e,cpu) => {
  let [reg] = e
  let src = cpu.DataEle.reg(reg,1)
  return {
    command: "PUSH",
    args: [src],
    run: () => {cpu.push(src)}
  }
})
instruction_define("000 {seg} 110", (e,cpu) => {
  let [seg] = e
  let src = cpu.DataEle.seg(seg)
  return {
    command: "PUSH",
    args: [src],
    run: () => {cpu.push(src)}
  }
})

instruction_define("1000 1111 {mod} 000 {rm}", (e,cpu) => {
  let [mod,rm] = e
  let obj = cpu.DataEle.r_mem(mod,rm,1)
  return {
    command: "POP",
    args: [obj],
    run: () => {cpu.pop(obj)}
  }
})
instruction_define("0101 1{reg}", (e,cpu) => {
  let [reg] = e
  let obj = cpu.DataEle.reg(reg,1)
  return {
    command: "POP",
    args: [obj],
    run: () => {cpu.pop(obj)}
  }
})
instruction_define("000{seg}111", (e,cpu) => {
  let [seg] = e
  let obj = cpu.DataEle.seg(seg)
  return {
    command: "POP",
    args: [obj],
    run: () => {cpu.pop(obj)}
  }
})

instruction_define("1000 011w {mod}{reg}{rm}", (e,cpu) => {
  let [w,mod,reg,rm] = e
  let a = cpu.DataEle.r_mem(mod,rm,w)
  let b = cpu.DataEle.reg(reg,w)
  return {
    command: "XCHG",
    args: [a,b],
    run: () => {
      let [_a,_b] = [a.data(),b.data()]
      a.assign(_b);b.assign(_a)
    }
  }
})
instruction_define("1001 0{reg}", (e,cpu) => {
  let [reg] = e
  let a = cpu.DataEle.reg("AX")
  let b = cpu.DataEle.reg(reg,1)
  if (b.sign == "AX") {
    return {
      command: "NOP",
      run: () => {}
    }
  }
  else {
    return {
      command: "XCHG",
      args: [a,b],
      run: () => {
        let [_a,_b] = [a.data(),b.data()]
        a.assign(_b);b.assign(_a)
      }
    }
  }
})

// ARITHMETIC

const add = (od,sd,cpu,w) => {
  let v = w + 1;
  let mask = 1 << (v * 8);
  [od,sd] = [(od & (mask-1)),(sd & (mask-1))];
  let sum = od + sd;
  cpu.flag_assign("ZF", !(sum % mask))
  cpu.flag_assign("AF", (od % 0x10 + sd % 0x10) / 0x10)
  cpu.flag_assign("CF", parseInt(sum / mask))
  cpu.flag_assign("SF", sum & (1 << (v * 8 - 1)))
  cpu.flag_assign("PF", [...Array(v*2).keys()].map((i) => {return !!(sum & (1<<i))}).reduce((a, b) => a + b, 0))
  cpu.flag_assign("OF", ((od & (1 << (v * 8 - 1))) == sd & (1 << (v * 8 - 1))) ? ((od & (1 << (v * 8 - 1))) != sum & (1 << (v * 8 - 1))) : false)
  return sum
}

const sub = (od,sd,cpu,w) => {
  let v = w + 1;
  let mask = 1 << (v * 8);
  sd = -sd;
  [od,sd] = [(od & (mask-1)),(sd & (mask-1))];
  let sum = od + sd;
  cpu.flag_assign("ZF", !(sum % mask))
  cpu.flag_assign("AF", !((od % 0x10 + sd % 0x10) / 0x10))
  cpu.flag_assign("CF", !parseInt(sum / mask))
  cpu.flag_assign("SF", sum & (1 << (v * 8 - 1)))
  cpu.flag_assign("PF", [...Array(v*2).keys()].map((i) => {return !!(sum & (1<<i))}).reduce((a, b) => a + b, 0))
  cpu.flag_assign("OF", ((od & (1 << (v * 8 - 1))) == sd & (1 << (v * 8 - 1))) ? ((od & (1 << (v * 8 - 1))) != sum & (1 << (v * 8 - 1))) : false)
  return sum
}

const withsign = (num,w = 0) => {
  let v = (w+1) * 8
  if (num & (1 << (v-1))) {
    return num - (1 << v)
  }
  else {
    return num
  }
}

instruction_define("0000 00dw {mod} {reg} {rm}", (e,cpu) => {
  let [d,w,mod,reg,rm] = e
  let src = cpu.DataEle.reg(reg,w)
  let obj = cpu.DataEle.r_mem(mod,rm,w)
  if (d) {[obj, src] = [src, obj]}
  return {
    command: "ADD",
    args: [obj,src],
    run: () => {
      obj.assign(
        add(
          obj.data(),
          src.data(),
      cpu,w))
    }
  }
})
instruction_define("1000 00sw {mod} 000 {rm}", (e,cpu) => {
  let [s,w,mod,rm] = e
  let obj = cpu.DataEle.r_mem(mod,rm,w)
  let c = withsign(cpu.fetch((s<<1) + w),w)
  let src = cpu.DataEle.imm(c,w)
  return {
    command: "ADD",
    args: [obj,src],
    run: () => {
      obj.assign(
        add(
          obj.data(),
          src.data(),
      cpu,w))
    }
  }
})
instruction_define("0000 010w" ,(e,cpu) => {
  let [w] = e
  let src = cpu.DataEle.imm(cpu.fetch(w))
  let obj = cpu.DataEle.reg(0,w)
  return {
    command: "ADD",
    args: [obj,src],
    run: () => {
      obj.assign(
        add(
          obj.data(),
          src.data(),
      cpu,w))
    }
  }
})

instruction_define("0001 00dw {mod} {reg} {rm}", (e,cpu) => {
  let [d,w,mod,reg,rm] = e
  let src = cpu.DataEle.reg(reg,w)
  let obj = cpu.DataEle.r_mem(mod,rm,w)
  if (d) {[obj, src] = [src, obj]}
  return {
    command: "ADC",
    args: [obj,src],
    run: () => {
      obj.assign(
        add(
          obj.data(),
          src.data() + cpu.flag("CF"),
      cpu,w))
    }
  }
})
instruction_define("1000 00sw {mod} 010 {rm}", (e,cpu) => {
  let [s,w,mod,rm] = e
  let obj = cpu.DataEle.r_mem(mod,rm,w)
  let c = withsign(cpu.fetch((s<<1) + w),w)
  let src = cpu.DataEle.imm(c,w)
  return {
    command: "ADD",
    args: [obj,src],
    run: () => {
      obj.assign(
        add(
          obj.data(),
          src.data() + cpu.flag("CF"),
      cpu,w))
    }
  }
})
instruction_define("0001 010w" ,(e,cpu) => {
  let [w] = e
  let src = cpu.DataEle.imm(cpu.fetch(w))
  let obj = cpu.DataEle.reg(0,w)
  return {
    command: "ADD",
    args: [obj,src],
    run: () => {
      obj.assign(
        add(
          obj.data(),
          src.data() + cpu.flag("CF"),
      cpu,w))
    }
  }
})

instruction_define("1111 111w {mod} 000 {rm}", (e,cpu) => {
  let [w,mod,rm] = e
  let obj = cpu.DataEle.r_mem(mod,rm,w)
  return {
    command: "INC",
    args: [obj],
    run: () => {obj.assign(add(obj.data(),1,cpu,w))}
  }
})
instruction_define("0100 0{reg}", (e,cpu) => {
  let [reg] = e
  let obj = cpu.DataEle.reg(reg,1)
  return {
    command: "INC",
    args: [obj],
    run: () => {obj.assign(add(obj.data(),1,cpu,w))}
  }
})

// SUB: Subtract
instruction_define("0010 10dw {mod} {reg} {rm}", (e,cpu) => {
  let [d,w,mod,reg,rm] = e
  let src = cpu.DataEle.reg(reg,w)
  let obj = cpu.DataEle.r_mem(mod,rm,w)
  if (d) {[obj, src] = [src, obj]}
  return {
    command: "SUB",
    args: [obj,src],
    run: () => {
      obj.assign(
        sub(
          obj.data(),
          src.data(),
      cpu,w))
    }
  }
})
instruction_define("1000 00sw {mod} 101 {rm}", (e,cpu) => {
  let [s,w,mod,rm] = e
  let obj = cpu.DataEle.r_mem(mod,rm,w)
  let c = withsign(cpu.fetch((s<<1) + w),w)
  let src = cpu.DataEle.imm(c,w)
  return {
    command: "SUB",
    args: [obj,src],
    run: () => {
      obj.assign(
        sub(
          obj.data(),
          src.data(),
      cpu,w))
    }
  }
})
instruction_define("0010 110w" ,(e,cpu) => {
  let [w] = e
  let src = cpu.DataEle.imm(cpu.fetch(w))
  let obj = cpu.DataEle.reg(0,w)
  return {
    command: "SUB",
    args: [obj,src],
    run: () => {
      obj.assign(
        sub(
          obj.data(),
          src.data(),
      cpu,w))
    }
  }
})

// SBB: Subtract with Borrow
instruction_define("0001 10dw {mod} {reg} {rm}", (e,cpu) => {
  let [d,w,mod,reg,rm] = e
  let src = cpu.DataEle.reg(reg,w)
  let obj = cpu.DataEle.r_mem(mod,rm,w)
  if (d) {[obj, src] = [src, obj]}
  return {
    command: "SBB",
    args: [obj,src],
    run: () => {
      obj.assign(
        sub(
          obj.data(),
          src.data() + cpu.flag("CF"),
      cpu,w))
    }
  }
})
instruction_define("1000 00sw {mod} 011 {rm}", (e,cpu) => {
  let [s,w,mod,rm] = e
  let obj = cpu.DataEle.r_mem(mod,rm,w)
  let c = withsign(cpu.fetch((s<<1) + w),w)
  let src = cpu.DataEle.imm(c,w)
  return {
    command: "SBB",
    args: [obj,src],
    run: () => {
      obj.assign(
        sub(
          obj.data(),
          src.data() + cpu.flag("CF"),
      cpu,w))
    }
  }
})
instruction_define("0000 111w" ,(e,cpu) => {
  let [w] = e
  let src = cpu.DataEle.imm(cpu.fetch(w))
  let obj = cpu.DataEle.reg(0,w)
  return {
    command: "SBB",
    args: [obj,src],
    run: () => {
      obj.assign(
        sub(
          obj.data(),
          src.data() + cpu.flag("CF"),
      cpu,w))
    }
  }
})

// DEC: Decrement
instruction_define("1111 111w {mod} 001 {rm}", (e,cpu) => {
  let [w,mod,rm] = e
  let obj = cpu.DataEle.r_mem(mod,rm,w)
  return {
    command: "DEC",
    args: [obj],
    run: () => {obj.assign(sub(obj.data(),1,cpu,w))}
  }
})
instruction_define("0100 1{reg}", (e,cpu) => {
  let [reg] = e
  let obj = cpu.DataEle.reg(reg,1)
  return {
    command: "DEC",
    args: [obj],
    run: () => {obj.assign(sub(obj.data(),1,cpu,w))}
  }
})

// NEG: Change sign
instruction_define("1111 011w {mod} 011 {rm}", (e,cpu) => {
  let [w,mod,rm] = e
  let obj = cpu.DataEle.r_mem(mod,rm,w)
  return {
    command: "NEG",
    args: [obj],
    run: () => {
      return (obj.data() ^ ((1<<(8*(w+1)))-1)) + 1
    }
  }
})

module.exports = {
  instruction_set: instruction_set,
  instruction: instruction_match
}
