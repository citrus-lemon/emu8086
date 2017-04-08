const cpu = require('./core.js')

class emu8086_runtime extends cpu {
  constructor() {
    super()
    this.code = []
    this.onevent("init",() => {});
    this.onevent("halt",() => {});
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
        this.memory_block = []
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
      }).bind(this);
      return;
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
        break;
      case "POP":
        s = this.stack.pop()
        // if (s.type !== "stack") {console.error("error stack pop")}
        break;
      case "CALL":
        this.stack.push({
          type: "call",
          code: code,
          position: (code.args),
          value: code.intersection ? {CS:this.register("CS"),PC:this.register("PC")} : {PC:this.register("PC")}
        })
        this.calllevel += 1
        break;
      case "RET":
        s = this.stack.pop()
        this.calllevel -= 1
        // if (s.type !== "call") {console.error("error stack call pop")}
        break;
      default:
        break;
    }
  }

  step() {
    let code = this.instruction.bind(this)()
    this.steptimes += 1
    if (code.command) {
      // console.log(`${this.steptimes}: ${pc.toString(16)} ${code.command} ${code.args && (code.args.map((e) => e.toString(16)).join(','))}`)
      this.event("step")(this,code)
      this.stack_log(code)
      code.run()
      this.event("stepdone")(this,code)
      return code
    }
    else {
      // TODO: more explaination
      console.log(`code parse error at ${this.register("PC").toString(16)}`)
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
    this.parseCode()
  }

  parseCode() {
    this.codeparse = []
    for (; this.register("PC") < this.codelength; ) {
      let code = this.instruction.bind(this)()
      if (code.command) {
        code.run = void(0)
        code.endwith = this.register("PC")
        this.codeparse.push(code)
      }
      else {
        break;
      }
    }
    this.register_assign("PC",0)
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
    this.breakpoints.steptimes.push(times)
  }

  run() {
    this.runstatus = true
    while (this.runstatus) {
      if (this.enablebreak && this.breakpoints) {
        // braekpoints
        if (
          this.breakpoints.steptimes.includes(this.steptimes + 1) ||
          this.breakpoints.offset.includes(this.register("PC"))
        ) {
          this.runstatus = false
          break;
        }
      }
      this.step()
    }
    this.enablebreak && this.event("debugstep")(this);
  }

  stepInto() {
    this.event("debugstep")(this,this.step());
  }

  stepOut() {
    let code
    if (this.calllevel > 0) {
      let depth = this.calllevel
      this.runstatus = true
      while (this.runstatus) {
        if (this.enablebreak && this.breakpoints) {
          // braekpoints
          if (
            this.breakpoints.steptimes.includes(this.steptimes + 1) ||
            this.breakpoints.offset.includes(this.register("PC"))
          ) {
            this.runstatus = false
            break;
          }
        }
        code = this.step()
        if (!(this.calllevel > depth - 1)) {break};
      }
    }
    else {
      code = this.step()
    }
    this.event("debugstep")(this,code);
  }

  stepOver() {
    let depth = this.calllevel
    let code
    this.runstatus = true
    while (this.runstatus) {
      if (this.enablebreak && this.breakpoints) {
        // braekpoints
        if (
          this.breakpoints.steptimes.includes(this.steptimes + 1) ||
          this.breakpoints.offset.includes(this.register("PC"))
        ) {
          this.runstatus = false
          break;
        }
      }
      code = this.step()
      if (!(this.calllevel > depth)) {break};
    }
    this.event("debugstep")(this,code);
  }
}

module.exports = emu8086_runtime
