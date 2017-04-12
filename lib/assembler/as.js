class Assembler {
  constructor(opts) {
    this.options = opts || {}
  }

  loadSource(code) {
    if (code) {

      return this
    }
    else {
      return void(0)
    }
  }

  assemble() {

  }

  binary() {

  }

  // exception

  warning(info) {this.errorlist.push(`warning[${this.line + 1}]: ${info}`)}
  error(info) {this.errorlist.push(`error[${this.line + 1}]: ${info}`);this.errorflag = true}
  fatal(info) {this.errorlist.push(`fatal[${this.line + 1}]: ${info}`);throw `fatal error [${this.line + 1}]: ${info} ;then Assembler halt`}

}

module.exports = Assembler
