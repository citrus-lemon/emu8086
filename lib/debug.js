const cpu = require('./core.js')

class emu8086_runtime extends cpu {
  constructor() {
    super()
  }

  stack() {

  }

  step() {
    let code = this.instruction.bind(this)()
    if (code.command) {
      console.log(`${code.command} ${code.args && (code.args.map((e) => e.toString).join(','))}`)
    }
    else {
      // TODO: more explaination
      console.log(`code parse error at`)
      return false
    }
  }

  load(code) {
    this.codelength = code.length
    let cs = this.register("CS")
    for (var i = 0; i < code.length; i++) {
      var byte = code[i];
      if (byte > 0xff) {console.error(`code has invaild data at offset:${i}`);break}
      this.memory_assign(cs + i, byte)
    }
  }

  // debug

  run() {

  }

  stepInto() {

  }

  stepOut() {

  }

  stepOver() {

  }
}

module.exports = emu8086_runtime
