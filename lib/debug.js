const cpu = require('./core.js')

class emu8086_runtime extends cpu {
  constructor() {
    super()
    this.code = []
    this.onevent("init",() => {})
  }

  onevent(name,fn) {
    if (name.toLowerCase() == "init") {
      this.event_list["init"] = (() => {
        this.steptimes = 0
        this.stack = []
        this.rowstack = []
        this.calllevel = 0
        this.register_list = {
          AX: 0, BX: 0, CX: 0, DX: 0,
          SI: 0, DI: 0, BP: 0, SP: 0x400,
          PC: 0,
          CS: 0, DS: 0, ES: 0, SS: 0x400,
          FLAG: 0
        }
        fn(this)
        this.load(this.code)
      }).bind(this)
      this.event_list["init"]()
      return;
    }
    else if (name.toLowerCase() == "halt") {
      this.event_list["halt"] = (() => {
        this.runstatus = false
        fn(this)
      })
    }
    this.event_list[name.toLowerCase()] = fn
  }

  stack_log(code) {
    let s
    switch (code.command) {
      case "PUSH":
        this.stack.push({
          type: "stack",
          obj: code.args[0],
          value: code.args[0].data()
        })
        this.calllevel += 1
        break;
      case "POP":
        s = this.stack.pop()
        this.calllevel -= 1
        if (s.type !== "stack") {console.error("error stack pop")}
        break;
      case "CALL":
        this.stack.push({
          type: "call",
          position: (code.args),
          value: code.intersection ? {CS:this.register("CS"),PC:this.register("PC")} : {PC:this.register("PC")}
        })
        break;
      case "RET":
        s = this.stack.pop()
        if (s.type !== "call") {console.error("error stack call pop")}
        break;
      default:
        break;
    }
  }

  step() {
    let code = this.instruction.bind(this)()
    this.steptimes += 1
    global.steptimes = this.steptimes
    if (code.command) {
      // console.log(`${this.steptimes}: ${pc.toString(16)} ${code.command} ${code.args && (code.args.map((e) => e.toString(16)).join(','))}`)
      this.event("step")(this,code)
      this.stack_log(code)
      code.run()
      this.event("stepdone")(this,code)
    }
    else {
      // TODO: more explaination
      console.log(`code parse error at ${pc.toString(16)}`)
      return false
    }
  }

  load(code) {
    this.code = code
    this.codelength = code.length
    let cs = this.register("CS")
    for (var i = 0; i < code.length; i++) {
      var byte = code[i];
      if (byte > 0xff) {console.error(`code has invaild data at offset:${i}`);break}
      this.memory_assign(cs + i, byte)
    }
  }

  push(el) {
    super.push(el)
    this.rowstack.push(el.data())
  }

  pop(el) {
    super.pop(el)
    this.rowstack.pop()
  }

  // debug

  setBreakPointAtOffset(offset) {
    this.breakpoints = this.breakpoints || {offset:[],steptimes:[]};
    this.breakpoints.offset.push(offset)
  }

  setBreakPointAtTimes(times) {
    this.breakpoints = this.breakpoints || {offset:[],steptimes:[]};
    this.breakpoints.offset.push(offset)
  }

  run() {
    this.runstatus = true
    while (this.runstatus) {
      this.step()
      if (this.enablebreak) {
        // braekpoints
      }
    }
  }

  stepInto() {

  }

  stepOut() {

  }

  stepOver() {

  }
}

module.exports = emu8086_runtime
