const { Exception, parseCode, chooseSegment, assumeFirst } = require('./classes.js')
const acs = require('./codeset.js')

class Assembler {
  constructor(opts) {
    this.options = opts || {}
    this.exception = new Exception(this)
    this.errorlist = []
    this.parseCode = parseCode.bind(this)
    this.chooseSegment = chooseSegment.bind(this)
    this.CodeSet = acs
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

      this.errorflag || this.chooseSegment('all').map((el) => (el && el.compile()))

      // compile

      // TODO
    } catch (error) {
      if (error !== 'assembler procedure fatal error') {
        throw error;
      }
      this.fatalflag = true
    }

    // export error message
    this.errorlist.sort((a,b) => (a.line - b.line))
    this.errorlist.map((err,i) => console.error(err.toString()))
    this.fatalflag && console.error('fatal error, halt assemble')

    return this
  }

  binary() {
    if (this.segment_mode === 0) {
      return this.current_segment.binary()
    }
    else if (this.segment_mod === 1) {
      // TODO
      return []
    }
    else {
      console.error('no code mode')
      return []
      // this.exception.warning('no code')
    }
  }

}

module.exports = Assembler
