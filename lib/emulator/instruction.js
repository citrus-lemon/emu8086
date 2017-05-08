let instruction_set = []
function instruction_define(op,act) {
  let code = {
    match: [],
    par:   []
  }
  let mark = op.replace(/\s/g,'')
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
    else if (f === "mod" || f === "seg") {
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
  if (!(mark.length % 8)) {
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

function instruction_match() {
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
  let src = cpu.DataEle.mem(cpu.fetchw(),"DS",w)
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
  cpu.flag_assign("PF", !([...Array(v*2).keys()].map((i) => {return !!(sum & (1<<i))}).reduce((a, b) => a + b, 0) % 2))
  cpu.flag_assign("OF", ((od & (1 << (v * 8 - 1))) == sd & (1 << (v * 8 - 1))) ? ((od & (1 << (v * 8 - 1))) != sum & (1 << (v * 8 - 1))) : false)
  return sum
}

const sub = (od,sd,cpu,w) => {
  let v = w + 1;
  let mask = 1 << (v * 8);
  [od,sd] = [(od & (mask-1)),(sd & (mask-1))];
  cpu.flag_assign("CF", !(od >= sd))
  sd = (-sd) & (mask-1);
  let sum = od + sd;
  cpu.flag_assign("ZF", !(sum % mask))
  cpu.flag_assign("AF", !((od % 0x10 + sd % 0x10) / 0x10))
  cpu.flag_assign("SF", sum & (1 << (v * 8 - 1)))
  cpu.flag_assign("PF", !([...Array(v*2).keys()].map((i) => {return !!(sum & (1<<i))}).reduce((a, b) => a + b, 0) % 2))
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
  let c = cpu.fetch((s<<1) + w);;;(((s<<1)+w) == 3) && (c = withsign(c) & 0xffff);
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
  let c = cpu.fetch((s<<1) + w);;;(((s<<1)+w) == 3) && (c = withsign(c) & 0xffff);
  let src = cpu.DataEle.imm(c,w)
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
instruction_define("0001 010w" ,(e,cpu) => {
  let [w] = e
  let src = cpu.DataEle.imm(cpu.fetch(w))
  let obj = cpu.DataEle.reg(0,w)
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
    run: () => {obj.assign(add(obj.data(),1,cpu,1))}
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
  let c = cpu.fetch((s<<1) + w);;;(((s<<1)+w) == 3) && (c = withsign(c) & 0xffff);
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
  let c = cpu.fetch((s<<1) + w);;;(((s<<1)+w) == 3) && (c = withsign(c) & 0xffff);
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
    run: () => {obj.assign(sub(obj.data(),1,cpu,1))}
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

// CMP: Compare
instruction_define("0011 10dw {mod} {reg} {rm}", (e,cpu) => {
  let [d,w,mod,reg,rm] = e
  let src = cpu.DataEle.reg(reg,w)
  let obj = cpu.DataEle.r_mem(mod,rm,w)
  if (d) {[obj, src] = [src, obj]}
  return {
    command: "CMP",
    args: [obj,src],
    run: () => {
      sub(obj.data(),src.data(),cpu,w)
    }
  }
})
instruction_define("1000 00sw {mod} 111 {rm}", (e,cpu) => {
  let [s,w,mod,rm] = e
  let obj = cpu.DataEle.r_mem(mod,rm,w)
  let c = cpu.fetch((s<<1) + w);;;(((s<<1)+w) == 3) && (c = withsign(c) & 0xffff);
  let src = cpu.DataEle.imm(c,w)
  return {
    command: "CMP",
    args: [obj,src],
    run: () => {
      sub(obj.data(),src.data(),cpu,w)
    }
  }
})
instruction_define("0011 110w" ,(e,cpu) => {
  let [w] = e
  let src = cpu.DataEle.imm(cpu.fetch(w))
  let obj = cpu.DataEle.reg(0,w)
  return {
    command: "CMP",
    args: [obj,src],
    run: () => {
      sub(obj.data(),src.data(),cpu,w)
    }
  }
})

instruction_define("1111 011w {mod} 110 {rm}", (e,cpu) => {
  let [w,mod,rm] = e
  let divnum = cpu.DataEle.r_mem(mod,rm,w)
  return {
    command: "DIV",
    args: [divnum],
    run: () => {
      if (w) {
        let AX = cpu.register("AX")
        let DX = cpu.register("DX")
        let dd = DX * 0x10000 + AX
        let [d,m] = [dd / divnum.data() | 0, dd % divnum.data()]
        cpu.register_assign("AX",d)
        cpu.register_assign("DX",m)
      }
      else {
        let dd = cpu.register("AX")
        let [d,m] = [dd / divnum.data() | 0, dd % divnum.data()]
        cpu.register_assign("AL",d)
        cpu.register_assign("AH",m)
      }
    }
  }
})

// LOGIC

const logic = (ans,cpu,w) => {
  cpu.flag_assign("CF",0)
  cpu.flag_assign("OF",0)
  let mask = 1 << ((w+1)*8)
  cpu.flag_assign("ZF", !(ans % mask))
  cpu.flag_assign("SF", ans & (1 << ((w+1) * 8 - 1)))
  cpu.flag_assign("PF", !([...Array((w+1)*2).keys()].map((i) => {return !!(ans & (1<<i))}).reduce((a, b) => a + b, 0) % 2))
}

// NOT: Invert
instruction_define("1111 011w {mod} 010 {rm}", (e,cpu) => {
  let [w,mod,rm] = e
  let obj = cpu.DataEle.r_mem(mod,rm,w)
  return {
    command: "NOT",
    args: [obj],
    run: () => {obj.assign(~obj.data())}
  }
})
// SHL/SAL: Shift Logical/Arithmetic Left
instruction_define("1101 00vw {mod} 100 {rm}", (e,cpu) => {
  let [v,w,mod,rm] = e
  let shift = v ? cpu.DataEle.reg("CL").data() : 1
  let shag = v ? cpu.DataEle.reg("CL") : 1
  let obj = cpu.DataEle.r_mem(mod,rm,w)
  return {
    command: "SHL",
    args: [obj,shag],
    run: () => {
      let sf = !!(obj.data() & (1 << ((w+1) * 8 - 1)))
      let ans = obj.data() << shift
      logic(ans,cpu,w)
      obj.assign(ans)
      cpu.flag_assign("OF", cpu.flag("SF") != sf)
      cpu.flag_assign("CF", ans & (1<<((w+1)*8)))
    }
  }
})
// SHR: Shift Logical Right
instruction_define("1101 00vw {mod} 101 {rm}", (e,cpu) => {
  let [v,w,mod,rm] = e
  let shift = v ? cpu.DataEle.reg("CL").data() : 1
  let shag = v ? cpu.DataEle.reg("CL") : 1
  let obj = cpu.DataEle.r_mem(mod,rm,w)
  return {
    command: "SHR",
    args: [obj,shag],
    run: () => {
      let sf = !!(obj.data() & (1 << ((w+1) * 8 - 1)))
      let ans = obj.data() >> shift
      let cf = obj.data() & (1<<shift>>1)
      logic(ans,cpu,w)
      cpu.flag_assign("OF", cpu.flag("SF") != sf)
      cpu.flag_assign("CF", cf)
      obj.assign(ans)
    }
  }
})
// SAR: Shift Logical Right
instruction_define("1101 00vw {mod} 111 {rm}", (e,cpu) => {
  let [v,w,mod,rm] = e
  let shift = v ? cpu.DataEle.reg("CL").data() : 1
  let shag = v ? cpu.DataEle.reg("CL") : 1
  let obj = cpu.DataEle.r_mem(mod,rm,w)
  return {
    command: "SAR",
    args: [obj,shag],
    run: () => {
      let sf = !!(obj.data() & (1 << ((w+1) * 8 - 1)))
      let value = (((0x100000 - 1) * sf) << ((w+1)*8)) + obj.data()
      let ans = value >> shift
      let cf = obj.data() & (1<<shift>>1)
      logic(ans,cpu,w)
      cpu.flag_assign("OF", cpu.flag("SF") != sf)
      cpu.flag_assign("CF", cf)
      obj.assign(ans)
    }
  }
})
// ROL: Rotate Left
instruction_define("1101 00vw {mod} 000 {rm}", (e,cpu) => {
  let [v,w,mod,rm] = e
  let shift = v ? cpu.DataEle.reg("CL").data() : 1
  let shag = v ? cpu.DataEle.reg("CL") : 1
  let obj = cpu.DataEle.r_mem(mod,rm,w)
  return {
    command: "ROL",
    args: [obj,shag],
    run: () => {
      let cf = cpu.flag("CF")
      let sf = !!(obj.data() & (1 << ((w+1) * 8 - 1)))
      let ans = obj.data()
      for (var i = 0; i < shift; i++) {
        ans = ans << 1
        cf = !!(ans & (1<<((w+1)*8)))
        ans = (ans + cf) % (1<<((w+1)*8))
      }
      logic(ans,cpu,w)
      obj.assign(ans)
      cpu.flag_assign("OF", cpu.flag("SF") != sf)
      cpu.flag_assign("CF", cf)
    }
  }
})
// ROR: Rotate Right
instruction_define("1101 00vw {mod} 001 {rm}", (e,cpu) => {
  let [v,w,mod,rm] = e
  let shift = v ? cpu.DataEle.reg("CL").data() : 1
  let shag = v ? cpu.DataEle.reg("CL") : 1
  let obj = cpu.DataEle.r_mem(mod,rm,w)
  return {
    command: "ROR",
    args: [obj,shag],
    run: () => {
      let cf = cpu.flag("CF")
      let sf = !!(obj.data() & (1 << ((w+1) * 8 - 1)))
      let ans = obj.data()
      for (var i = 0; i < shift; i++) {
        cf = ans % 2
        ans = ans >> 1
        ans = (ans + (cf<<(((w+1)*8)-1)))
      }
      logic(ans,cpu,w)
      obj.assign(ans)
      cpu.flag_assign("OF", cpu.flag("SF") != sf)
      cpu.flag_assign("CF", cf)
    }
  }
})
// RCL: Rotate through Carry Left
instruction_define("1101 00vw {mod} 010 {rm}", (e,cpu) => {
  let [v,w,mod,rm] = e
  let shift = v ? cpu.DataEle.reg("CL").data() : 1
  let shag = v ? cpu.DataEle.reg("CL") : 1
  let obj = cpu.DataEle.r_mem(mod,rm,w)
  return {
    command: "RCL",
    args: [obj,shag],
    run: () => {
      let cf = cpu.flag("CF")
      let sf = !!(obj.data() & (1 << ((w+1) * 8 - 1)))
      let ans = obj.data()
      for (var i = 0; i < shift; i++) {
        let lastcf = cf
        ans = ans << 1
        cf = !!(ans & (1<<((w+1)*8)))
        ans = (ans + lastcf) % (1<<((w+1)*8))
      }
      logic(ans,cpu,w)
      obj.assign(ans)
      cpu.flag_assign("OF", cpu.flag("SF") != sf)
      cpu.flag_assign("CF", cf)
    }
  }
})
// RCR: Rotate through Carry Right
instruction_define("1101 00vw {mod} 011 {rm}", (e,cpu) => {
  let [v,w,mod,rm] = e
  let shift = v ? cpu.DataEle.reg("CL").data() : 1
  let shag = v ? cpu.DataEle.reg("CL") : 1
  let obj = cpu.DataEle.r_mem(mod,rm,w)
  return {
    command: "RCR",
    args: [obj,shag],
    run: () => {
      let cf = cpu.flag("CF")
      let sf = !!(obj.data() & (1 << ((w+1) * 8 - 1)))
      let ans = obj.data()
      for (var i = 0; i < shift; i++) {
        let lastcf = cf
        cf = ans % 2
        ans = ans >> 1
        ans = (ans + (lastcf<<(((w+1)*8)-1)))
      }
      logic(ans,cpu,w)
      obj.assign(ans)
      cpu.flag_assign("OF", cpu.flag("SF") != sf)
      cpu.flag_assign("CF", cf)
    }
  }
})

// AND: And
instruction_define("0010 00dw {mod} {reg} {rm}", (e,cpu) => {
  let [d,w,mod,reg,rm] = e
  let src = cpu.DataEle.reg(reg,w)
  let obj = cpu.DataEle.r_mem(mod,rm,w)
  if (d) {[obj, src] = [src, obj]}
  return {
    command: "AND",
    args: [obj,src],
    run: () => {
      let ans = obj.data() & src.data()
      logic(ans,cpu,w)
      obj.assign(ans)
    }
  }
})
instruction_define("1000 00sw {mod} 100 {rm}", (e,cpu) => {
  let [s,w,mod,rm] = e
  let obj = cpu.DataEle.r_mem(mod,rm,w)
  let c = cpu.fetch((s<<1) + w);;;(((s<<1)+w) == 3) && (c = withsign(c) & 0xffff);
  let src = cpu.DataEle.imm(c,w)
  return {
    command: "AND",
    args: [obj,src],
    run: () => {
      let ans = obj.data() & src.data()
      logic(ans,cpu,w)
      obj.assign(ans)
    }
  }
})
instruction_define("0010 010w", (e,cpu) => {
  let [w] = e
  let src = cpu.DataEle.imm(cpu.fetch(w))
  let obj = cpu.DataEle.reg(0,w)
  return {
    command: "AND",
    args: [obj,src],
    run: () => {
      let ans = obj.data() & src.data()
      logic(ans,cpu,w)
      obj.assign(ans)
    }
  }
})

// TEST: And Function to Flags with No Result
instruction_define("1000 010w {mod} {reg} {rm}", (e,cpu) => {
  let [w,mod,reg,rm] = e
  let src = cpu.DataEle.reg(reg,w)
  let obj = cpu.DataEle.r_mem(mod,rm,w)
  return {
    command: "TEST",
    args: [obj,src],
    run: () => {
      let ans = obj.data() & src.data()
      logic(ans,cpu,w)
    }
  }
})
instruction_define("1111 011w {mod} 000 {rm}", (e,cpu) => {
  let [w,mod,rm] = e
  let obj = cpu.DataEle.r_mem(mod,rm,w)
  let src = cpu.DataEle.imm(cpu.fetch(w),w)
  return {
    command: "TEST",
    args: [obj,src],
    run: () => {
      let ans = obj.data() & src.data()
      logic(ans,cpu,w)
    }
  }
})
instruction_define("1010 100w", (e,cpu) => {
  let [w] = e
  let src = cpu.DataEle.imm(cpu.fetch(w))
  let obj = cpu.DataEle.reg(0,w)
  return {
    command: "TEST",
    args: [obj,src],
    run: () => {
      let ans = obj.data() & src.data()
      logic(ans,cpu,w)
    }
  }
})

// OR: Or
instruction_define("0000 10dw {mod} {reg} {rm}", (e,cpu) => {
  let [d,w,mod,reg,rm] = e
  let src = cpu.DataEle.reg(reg,w)
  let obj = cpu.DataEle.r_mem(mod,rm,w)
  if (d) {[obj, src] = [src, obj]}
  return {
    command: "OR",
    args: [obj,src],
    run: () => {
      let ans = obj.data() | src.data()
      logic(ans,cpu,w)
      obj.assign(ans)
    }
  }
})
instruction_define("1000 00sw {mod} 001 {rm}", (e,cpu) => {
  let [s,w,mod,rm] = e
  let obj = cpu.DataEle.r_mem(mod,rm,w)
  let c = cpu.fetch((s<<1) + w);;;(((s<<1)+w) == 3) && (c = withsign(c) & 0xffff);
  let src = cpu.DataEle.imm(c,w)
  return {
    command: "OR",
    args: [obj,src],
    run: () => {
      let ans = obj.data() | src.data()
      logic(ans,cpu,w)
      obj.assign(ans)
    }
  }
})
instruction_define("0000 110w", (e,cpu) => {
  let [w] = e
  let src = cpu.DataEle.imm(cpu.fetch(w))
  let obj = cpu.DataEle.reg(0,w)
  return {
    command: "OR",
    args: [obj,src],
    run: () => {
      let ans = obj.data() | src.data()
      logic(ans,cpu,w)
      obj.assign(ans)
    }
  }
})

// XOR: eXclusive or
instruction_define("0011 00dw {mod} {reg} {rm}", (e,cpu) => {
  let [d,w,mod,reg,rm] = e
  let src = cpu.DataEle.reg(reg,w)
  let obj = cpu.DataEle.r_mem(mod,rm,w)
  if (d) {[obj, src] = [src, obj]}
  return {
    command: "XOR",
    args: [obj,src],
    run: () => {
      let ans = obj.data() ^ src.data()
      logic(ans,cpu,w)
      obj.assign(ans)
    }
  }
})
instruction_define("1000 00sw {mod} 110 {rm}", (e,cpu) => {
  let [s,w,mod,rm] = e
  let obj = cpu.DataEle.r_mem(mod,rm,w)
  let c = cpu.fetch((s<<1) + w);;;(((s<<1)+w) == 3) && (c = withsign(c) & 0xffff);
  let src = cpu.DataEle.imm(c,w)
  return {
    command: "XOR",
    args: [obj,src],
    run: () => {
      let ans = obj.data() ^ src.data()
      logic(ans,cpu,w)
      obj.assign(ans)
    }
  }
})
instruction_define("0011 010w", (e,cpu) => {
  let [w] = e
  let src = cpu.DataEle.imm(cpu.fetch(w))
  let obj = cpu.DataEle.reg(0,w)
  return {
    command: "XOR",
    args: [obj,src],
    run: () => {
      let ans = obj.data() ^ src.data()
      logic(ans,cpu,w)
      obj.assign(ans)
    }
  }
})

// CONTROL TRANSFER

// CALL: Call
instruction_define("1110 1000", (e,cpu) => {
  let disp = cpu.fetchw()
  return {
    command: "CALL",
    intersection: false,
    args: [disp],
    run: () => {
      let pc = cpu.DataEle.reg("PC")
      cpu.push(pc)
      pc.assign(pc.data() + withsign(disp,1))
    }
  }
})
instruction_define("1111 1111 {mod} 010 {rm}", (e,cpu) => {
  let [mod,rm] = e
  let func = cpu.DataEle.r_mem(mod,rm,1)
  return {
    command: "CALL",
    intersection: false,
    args: [func],
    run: () => {
      let pc = cpu.DataEle.reg("PC")
      cpu.push(pc)
      pc.assign(func.data())
    }
  }
})
instruction_define("1001 1010", (e,cpu) => {
  let new_pc = cpu.fetchw()
  let new_cs = cpu.fetchw()
  return {
    command: "CALL",
    intersection: true,
    args: [new_pc,new_cs],
    run: () => {
      cpu.push(cpu.DataEle.reg("CS"))
      cpu.push(cpu.DataEle.reg("PC"))
      cpu.DataEle.reg("CS").assign(new_cs)
      cpu.DataEle.reg("PC").assign(new_pc)
    }
  }
})
instruction_define("1111 1111 {mod} 011 {rm}", (e,cpu) => {
  let [mod,rm] = e
  let func_pc = cpu.DataEle.r_mem(mod,rm,1)
  let func_cs = func_pc.next()
  return {
    command: "CALL",
    intersection: true,
    args: [func_pc,func_cs],
    run: () => {
      cpu.push(cpu.DataEle.reg("CS"))
      cpu.push(cpu.DataEle.reg("PC"))
      cpu.DataEle.reg("CS").assign(func_cs.data())
      cpu.DataEle.reg("PC").assign(func_pc.data())
    }
  }
})

// JMP: Unconditional Jump
instruction_define("1110 10n1", (e,cpu) => {
  let [n] = e
  let disp = n ? cpu.fetchb() : cpu.fetchw()
  return {
    command: "JMP",
    intersection: false,
    args: [disp],
    run: () => {
      let pc = cpu.DataEle.reg("PC")
      pc.assign(pc.data() + withsign(disp,1-n))
    }
  }
})
instruction_define("1111 1111 {mod} 100 {rm}", (e,cpu) => {
  let [mod,rm] = e
  let func = cpu.DataEle.r_mem(mod,rm,1)
  return {
    command: "JMP",
    intersection: false,
    args: [func],
    run: () => {
      let pc = cpu.DataEle.reg("PC")
      pc.assign(func.data())
    }
  }
})
instruction_define("1110 1010", (e,cpu) => {
  let new_pc = cpu.fetchw()
  let new_cs = cpu.fetchw()
  return {
    command: "JMP",
    intersection: true,
    args: [new_pc,new_cs],
    run: () => {
      cpu.DataEle.reg("CS").assign(new_cs)
      cpu.DataEle.reg("PC").assign(new_pc)
    }
  }
})
instruction_define("1111 1111 {mod} 101 {rm}", (e,cpu) => {
  let [mod,rm] = e
  let func_pc = cpu.DataEle.r_mem(mod,rm,1)
  let func_cs = func_pc.next()
  return {
    command: "JMP",
    intersection: true,
    args: [func_pc,func_cs],
    run: () => {
      cpu.DataEle.reg("CS").assign(func_cs.data())
      cpu.DataEle.reg("PC").assign(func_pc.data())
    }
  }
})

// RET: Return from CALL
instruction_define("1100 n011", (e,cpu) => {
  let [n] = e
  return {
    command: "RET",
    intersection: !!n,
    run: () => {
      cpu.pop(cpu.DataEle.reg("PC"))
      if (n) {cpu.pop(cpu.DataEle.reg("CS"))}
    }
  }
})

// Jump on condition
const condjmp = (name,code,fn) => {
  instruction_define(code, (e,cpu) => {
    let disp = withsign(cpu.fetchb())
    return {
      command: name.toUpperCase(),
      intersection: false,
      args: [disp],
      run: () => {
        if (fn(cpu.flag())) {let pc = cpu.DataEle.reg("PC"); pc.assign(pc.data() + disp)}
      }
    }
  })
}

condjmp("jz" ,"01110100",(e) => e.ZF)
condjmp("jl" ,"01111100",(e) => e.SF ^ e.OF)
condjmp("jle","01111110",(e) => (e.SF^e.OF) | e.ZF)
condjmp("jb" ,"01110010",(e) => e.CF)
condjmp("jbe","01110110",(e) => e.CF | e.ZF)
condjmp("jp" ,"01111010",(e) => e.PF)
condjmp("jo" ,"01110000",(e) => e.OF)
condjmp("js" ,"01111000",(e) => e.SF)
condjmp("jnz","01110101",(e) => !e.ZF)
condjmp("jnl","01111101",(e) => !(e.SF ^ e.OF))
condjmp("jg" ,"01111111",(e) => !((e.SF ^ e.OF)|e.ZF))
condjmp("jae","01110011",(e) => !e.CF)
condjmp("ja" ,"01110111",(e) => !(e.CF | e.ZF))
condjmp("jnp","01111011",(e) => !e.PF)
condjmp("jno","01110001",(e) => !e.OF)
condjmp("jns","01111001",(e) => !e.SF)

instruction_define("11100010", (e,cpu) => {
  let disp = withsign(cpu.fetchb())
  return {
    command: "LOOP",
    intersection: false,
    args: [disp],
    run: () => {
      let cx = cpu.DataEle.reg("CX")
      cx.assign(cx.data()-1)
      if (cx.data()) {let pc = cpu.DataEle.reg("PC"); pc.assign(pc.data() + disp)}
    }
  }
})
instruction_define("11100001", (e,cpu) => {
  let disp = withsign(cpu.fetchb())
  return {
    command: "LOOPZ",
    intersection: false,
    args: [disp],
    run: () => {
      let cx = cpu.DataEle.reg("CX")
      cx.assign(cx.data()-1)
      let e = cpu.flag()
      if (cx.data() && e.ZF) {let pc = cpu.DataEle.reg("PC"); pc.assign(pc.data() + disp)}
    }
  }
})
instruction_define("11100000", (e,cpu) => {
  let disp = withsign(cpu.fetchb())
  return {
    command: "LOOPNZ",
    intersection: false,
    args: [disp],
    run: () => {
      let cx = cpu.DataEle.reg("CX")
      cx.assign(cx.data()-1)
      let e = cpu.flag()
      if (cx.data() && !e.ZF) {let pc = cpu.DataEle.reg("PC"); pc.assign(pc.data() + disp)}
    }
  }
})
instruction_define("11100011", (e,cpu) => {
  let disp = withsign(cpu.fetchb())
  return {
    command: "jcxz",
    intersection: false,
    args: [disp],
    run: () => {
      let cx = cpu.DataEle.reg("CX")
      if (cx.data()) {let pc = cpu.DataEle.reg("PC"); pc.assign(pc.data() + disp)}
    }
  }
})

// INT: Interrupt

instruction_define("1100110n", (e,cpu) => {
  let [n] = e
  let type = n ? cpu.fetchb() : 3
  return {
    command: "INT",
    args: type,
    run: () => {
      cpu.event("int")(cpu,type)
    }
  }
})

instruction_define("11001110", (e,cpu) => {
  return {
    command: "INTO",
    run: () => {
      if (cpu.flag("OF")) {cpu.event("int")(4)}
    }
  }
})

// PROCESSOR CONTROL

instruction_define("11111000",(e,cpu) => ({command: "CLC", run:() => {cpu.flag_assign("CF",0)}}))
instruction_define("11110101",(e,cpu) => ({command: "CMC", run:() => {cpu.flag_assign("CF",!cpu.flag("CF"))}}))
instruction_define("11111001",(e,cpu) => ({command: "STC", run:() => {cpu.flag_assign("CF",1)}}))
instruction_define("11111100",(e,cpu) => ({command: "CLD", run:() => {cpu.flag_assign("DF",0)}}))
instruction_define("11111101",(e,cpu) => ({command: "STD", run:() => {cpu.flag_assign("DF",1)}}))
instruction_define("11111010",(e,cpu) => ({command: "CLI", run:() => {cpu.flag_assign("IF",0)}}))
instruction_define("11111011",(e,cpu) => ({command: "STI", run:() => {cpu.flag_assign("IF",1)}}))

instruction_define("11110100", (e,cpu) => {
  return {
    command: "HLT",
    run: () => {
      cpu.event("halt")(cpu)
    }
  }
})

instruction_define("10011011", (e,cpu) => {
  return {
    command: "WAIT",
    run: () => {
      cpu.event("wait")(cpu)
    }
  }
})

module.exports = {
  instruction_set: instruction_set,
  instruction: instruction_match
}
