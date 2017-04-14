const { Exception, parseCode, chooseSegment, assumeFirst } = require('./classes.js')

class Assembler {
  constructor(opts) {
    this.options = opts || {}
    this.exception = new Exception(this)
    this.errorlist = []
    this.parseCode = parseCode.bind(this)
    this.chooseSegment = chooseSegment.bind(this)
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
    try {
      assumeFirst.bind(this)()
      for (let i = 0; i < this.source.length; i++) {
        let code_line = this.source[i];
        let err = this.exception.produce(i)
        let code = this.parseCode(code_line, err)
        code && code.save && this.chooseSegment(0,err).push(code)
      }

      this.errorflag || this.chooseSegment('all').map((el) => el.compile())

      // compile

      // TODO
    } catch (error) {
      if (error !== 'assembler procedure fatal error') throw error;
    }

    // export error message
    this.errorlist.sort((a,b) => (a.line - b.line))
    this.errorlist.map((err,i) => console.error(err.toString()))

    return this
  }

  binary() {

  }

}

module.exports = Assembler
