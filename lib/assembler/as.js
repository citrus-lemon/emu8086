const { Exception, parseCode, chooseSegment, assumeFirst } = require('./classes.js')

class Assembler {
  constructor(opts) {
    this.options = opts || {}
    this.exception = new Exception(this)
    this.errorlist = []
    this.parseCode = parseCode.bind(this)
  }

  loadSource(code) {
    if (code) {
      this.source = code.split("\n")
      this.length = this.source.length
      this.line = 0
      return this
    }
    else {
      return void(0)
    }
  }

  assemble() {
    assumeFirst.bind(this)()
  }

  binary() {

  }

}

module.exports = Assembler
