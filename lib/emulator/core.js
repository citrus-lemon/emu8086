const flag_name = {
      CF: 0,
      PF: 2,
      AF: 4,
      ZF: 6,
      SF: 7,
      TF: 8,
      IF: 9,
      DF: 10,
      OF: 11,
    }
const reg_tab = [
        ["AL","CL","DL","BL","AH","CH","DH","BH"],
        ["AX","CX","DX","BX","SP","BP","SI","DI"]
      ]
const reg_seg = ["ES","CS","SS","DS"]
const rm_tab = [
        ["BX","SI"],
        ["BX","DI"],
        ["BP","SI"],
        ["BP","DI"],
        ["SI"],
        ["DI"],
        ["BP"],
        ["BX"],
      ]
const w_tag = ["byte","word"]

const {instruction} = require('./instruction.js')

class CPU {
  constructor() {
    // initialize with CPU status
    this.register_list = {
      AX: 0, BX: 0, CX: 0, DX: 0,
      SI: 0, DI: 0, BP: 0, SP: 0x400,
      PC: 0,
      CS: 0, DS: 0, ES: 0, SS: 0x400,
      FLAG: 0
    }

    this.memory_block = new Uint8Array(64000)

    this.event_list = {}

    this.DataEle = class DataElement {
      assign(value) {
        switch (this.class) {
          case "reg":
            this.self.register_assign(this.name,value)
            break;
          case "imm":
            console.error("Immediate data cannot be assigned")
            break;
          case "mem":
            this.self.memory_assign(this.addr,value,this.word)
            break;
          default:
            break;
        }
      }

      data() {
        switch (this.class) {
          case "reg":
            return this.self.register(this.name)
          case "imm":
            return this.value
          case "mem":
            return this.self.memory(this.addr,this.word)
          default:
            break;
        }
      }

      next() {
        if (this.class === "mem") {
          let e = new DataElement()
          e.class = "mem"
          e.base_segment = this.base_segment
          e.base = this.base
          e.eaad = this.eaad + this.word + 1
          e.addr = this.addr + this.word + 1
          e.word = this.word
          e.sign = `${w_tag[e.word]} [${e.eaad.toString(16)}H]`
          return e
        }
        else {
          console.error("don't have next memory")
        }
      }

      toString() {
        return this.sign || ""
      }
    }
    this.DataEle.prototype.self = this
    this.DataEle.reg = (d,w=2) => {
      let e = new this.DataEle()
      e.class = "reg"
      if (["AL","CL","DL","BL","AH","CH","DH","BH","FLAGL","FLAGH"].includes(d)) {
        e.sign = e.name = d
        e.word = 0
        return e
      }
      if (["AX","CX","DX","BX","SP","BP","SI","DI","ES","CS","SS","DS","PC","FLAG"].includes(d)) {
        e.sign = e.name = d
        e.word = 0
        return e
      }
      else {
        if (w === 2) {console.error("need Word Instruction param");return}
        e.sign = e.name = reg_tab[w][d]
        e.word = w
        if (!e.sign) {console.error("no code refer to register");return}
      }
      return e
    }
    this.DataEle.seg = (seg) => {
      return this.DataEle.reg(reg_seg[seg],1)
    }
    this.DataEle.r_mem = (mod,rm,w) => {
      if (mod === 3) {
        return this.DataEle.reg(rm,w)
      }
      else {
        let e = new this.DataEle()
        e.class = "mem"
        e.word = w
        if ((mod === 0) && (rm === 6)) {
          let disp = this.fetchw()
          e.base_segment = "DS"
          e.base = this.register("DS") * 16
          e.addr = e.base + disp
          e.eaad = disp
          e.sign = `${w_tag[e.word]} [${disp.toString(16)}H]`
        }
        else {
          if (rm_tab[rm].includes("BP")) {
            e.base = this.register("SS") * 16
            e.base_segment = "SS"
          }
          else {
            e.base = this.register("DS") * 16
            e.base_segment = "DS"
          }
          e.addr = e.base
          e.sign = rm_tab[rm].map((el) => {
            let r = this.DataEle.reg(el)
            e.addr += r.data()
            return r.sign
          }).join('+')
          let disp
          switch (mod) {
            case 0:
              disp = 0
              break;
            case 1:
              disp = this.fetchb()
              break;
            case 2:
              disp = this.fetchw()
              break;
            default:
              console.error('invaild mod')
              break;
          }
          e.eaad = disp
          e.addr += disp
          e.sign += mod ? `+${disp.toString(16)}H` : ""
          e.sign = `${w_tag[e.word]} [${e.sign}]`
        }
        return e
      }
    }
    this.DataEle.mem = (addr,baseseg = "DS",w = 1) => {
      let e = new this.DataEle()
      e.class = "mem"
      if (reg_seg.includes(baseseg.toUpperCase())) {
        e.base_segment = baseseg.toUpperCase()
        e.base = this.DataEle.reg(baseseg.toUpperCase()).data() * 16
      }
      else {
        e.base_segment = void(0)
        e.base = 0
      }
      e.addr = e.base + addr
      e.eaad = addr
      e.word = w
      e.sign = `${w_tag[e.word]} [${addr.toString(16)}]`
      return e
    }
    this.DataEle.imm = (v) => {
      let e = new this.DataEle()
      e.class = "imm"
      e.value = v % 0x10000
      e.sign = e.value.toString(16) + "H"
      if (v >= 0x10000) {console.error("Immediate data overflow")}
      return e
    }
  }

  register(reg) {
    if (reg.toUpperCase().match(/([A-D])([XLH])/)) {
      let match = reg.toUpperCase().match(/([A-D])([XLH])/)
      switch (match[2]) {
        case "X":
          return this.register_list[match[1] + "X"]
        case "L":
          return this.register_list[match[1] + "X"] & 0xff
        case "H":
          return (this.register_list[match[1] + "X"] & 0xff00) >> 8
        default:
          break;
      }
    }
    else if (["SI","DI","BP","SP","PC","CS","DS","ES","SS"].includes(reg.toUpperCase())) {
      return (this.register_list[reg.toUpperCase()])
    }
    else if (["FLAGL","FLAGH","FLAG"].includes(reg)) {
      switch (reg) {
        case "FLAG":
          return this.register.FLAG
        case "FLAGL":
          return this.register.FLAG & 0xff
        case "FLAGH":
          return (this.register.FLAG & 0xff00) >> 8
        default:
          break;
      }
    }
    else {
      console.error(`no register ${reg} existed`)
    }
  }

  register_assign(reg,value) {
    if (reg.toUpperCase().match(/([A-D])([XLH])/)) {
      let match = reg.toUpperCase().match(/([A-D])([XLH])/)
      switch (match[2]) {
        case "X":
          return this.register_list[match[1] + "X"] = value & 0xffff
        case "L":
          return this.register_list[match[1] + "X"] = (this.register_list[match[1] + "X"] & 0xff00) + (value & 0xff)
        case "H":
          return this.register_list[match[1] + "X"] = (this.register_list[match[1] + "X"] & 0xff) + ((value & 0xff) << 8)
        default:
          break;
      }
    }
    else if (["SI","DI","BP","SP","PC","CS","DS","ES","SS"].includes(reg.toUpperCase())) {
      return (this.register_list[reg.toUpperCase()] = value)
    }
    else if (["FLAGL","FLAGH","FLAG"].includes(reg)) {
      switch (reg) {
        case "FLAG":
          return this.register.FLAG = value & 0xffff
        case "FLAGL":
          return this.register.FLAG = (this.register.FLAG & 0xff00) + (value & 0xff)
        case "FLAGH":
          return this.register.FLAG = (this.register.FLAG & 0xff) + ((value & 0xff) << 8)
        default:
          break;
      }
    }
    else {
      console.error(`no register ${reg} existed`)
    }
  }

  memory(mem, w = 0) {
    switch (w) {
      case 0:
        return this.memory_block[mem] || 0
      case 1:
        return (this.memory_block[mem] || 0) + ((this.memory_block[mem+1] || 0) << 8)
      default:
        console.error('wrong memory word size')
        break;
    }

  }

  memory_assign(mem,value, w = 0) {
    switch (w) {
      case 0:
        // if (parseInt(value / 0x100) > 0) {console.log('value too large')}
        this.memory_block[mem] = value & 0xff
        break;
      case 1:
        // if (parseInt(value / 0x10000) > 0) {console.log('value too large')}
        this.memory_block[mem] = value & 0xff
        this.memory_block[mem+1] = (value & 0xff00) >> 8
        break;
      default:
        console.error('wrong memory word size')
        break;
    }
  }

  flag(name) {
    if (name) {
      if (flag_name.hasOwnProperty(name.toUpperCase())) {
        return !!(this.register.FLAG & (1 << flag_name[name.toUpperCase()]))
      }
      else if (["X","L","H"].includes(name.toUpperCase())) {
        switch (name.toUpperCase()) {
          case "X":
            return this.register.FLAG
          case "L":
            return this.register.FLAG & 0xff
          case "H":
            return (this.register.FLAG & 0xff00) >> 8
          default:
            break;
        }
      }
      else {
        console.error('flag name error')
      }
    }
    else {
      let ans = {}
      Object.keys(flag_name).forEach((key) => {
        ans[key] = !!(this.register.FLAG & (1 << flag_name[key]))
      })
      return ans
    }
  }

  flag_assign(name,value) {
    if (name) {
      if (flag_name.hasOwnProperty(name.toUpperCase())) {
        this.register.FLAG = (this.register.FLAG & ~(1 << flag_name[name.toUpperCase()])) + ((!!value) << flag_name[name.toUpperCase()])
      }
      else if (["X","L","H"].includes(name.toUpperCase())) {
        switch (name.toUpperCase()) {
          case "X":
            return this.register.FLAG = value & 0xffff
          case "L":
            return this.register.FLAG = (this.register.FLAG & 0xff00) + (value & 0xff)
          case "H":
            return this.register.FLAG = (this.register.FLAG & 0xff) + ((value & 0xff) << 8)
          default:
            break;
        }
      }
      else {
        console.error('flag name error')
      }
    }
    else {
      console.error('flag_assign expected flagname but nothing')
    }
  }

  event(name) {
    return this.event_list[name.toLowerCase()] || (() => {})
  }

  onevent(name,fn) {
    // TODO: add the description of events
    // CPU halt and debug events
    //   halt: do when cpu halt
    //   int: when cpu interupt
    //   init: initialize
    if (name.toLowerCase() == "init") {
      this.event_list[name.toLowerCase()] = (() => {
        this.register_list = {
          AX: 0, BX: 0, CX: 0, DX: 0,
          SI: 0, DI: 0, BP: 0, SP: 0x400,
          PC: 0,
          CS: 0, DS: 0, ES: 0, SS: 0x400,
          FLAG: 0
        }
        this.memory_block = []
        fn(this)
      }).bind(this)
      this.event_list[name.toLowerCase()]()
      return;
    }
    this.event_list[name.toLowerCase()] = fn
  }

  fetchb() {
    let b = this.memory(this.register("CS") * 16 + this.register("PC"))
    this.register_assign("PC",this.register("PC") + 1)
    return b
  }

  fetchw() {
    return this.fetchb() + (this.fetchb() << 8)
  }

  fetch(w) {
    if (w === 1) {
      return this.fetchw()
    }
    else {
      return this.fetchb()
    }
  }

  push(par) {
    let el
    if (typeof(par) === 'number') {
      el = this.DataEle.imm(par,1)
    }
    else {
      el = par
    }
    let sp = this.DataEle.reg("SP")
    sp.assign(sp.data() - 2)
    let top = this.DataEle.mem(sp.data(),"SS",1)
    top.assign(el.data())
    return el
  }

  pop(el = void(0)) {
    let sp = this.DataEle.reg("SP")
    let top = this.DataEle.mem(sp.data(),"SS",1)
    if (el) {
      el.assign(top.data())
    }
    top.assign(0)
    sp.assign(sp.data() + 2)
    return el
  }

  step() {
    let code = this.instruction.bind(this)()
    if (code.command) {
      code.run()
    }
    else {
      // TODO: more explaination
      console.log(`code parse error at`)
      return false
    }
  }

  loadCode(code) {
    let cs = this.register("CS")
    for (var i = 0; i < code.length; i++) {
      var byte = code[i];
      if (byte > 0xff) {console.error(`code has invaild data at offset:${i}`);break}
      this.memory_assign(cs + i, byte)
    }
  }


  DataElement() {
    return this.DataEle
  }
}

CPU.prototype.instruction = instruction

module.exports = CPU

