const {Element, SingletonCode} = require('./asclass.js')
class Assembler {
  constructor(code,opts) {
    this.options = opts || {}
    this.content = code.split("\n")
    this.rows = content.length
    this.errorlist = []
    this.line = 0
  }

  assemble() {
    this.code = {
      "main": {
        codes: [],
        name: "code",
        label: {}
      },
      "data": {
        codes: [],
        name: "data",
        label: {}
      },
      "stack": {
        codes: [],
        name: "stack",
        label: {}
      },
      "extra": {
        codes: [],
        name: "extra",
        label: {}
      }
    }
    this.datalabel = {}
    this.segment = "main"
    this.offset = 0
    let label, code, para

    // parse the code

    ;[...Array(this.rows).keys()].forEach((i) => {
      this.line = i

      let match = this.content[this.line].match(/^((?:\'(?:(?:\\.)|[^\.])*?\'|[^;#])*)(?:[;#](.*))*$/)
      let code_string = match[1]
      let comment = match[2]

      if (match = code_string.match(/^(?:\s*(\w*):?\s+)*(segment|ends|db|dw)\s+(.*?)$/i)) {
        let pseudo = match[2]
        switch (pseudo) {
          case 'segment':
            break;
          case 'ends':
            break;
          default:
            let l = (match[1].trim() === '') ? void(0) : match[1];
            (label && l) && this.warning(`label ${label} at offset ${this.offset} has been redefine, the previous has been ignored`);
            l && (label = l);
            code = match[2];
            para = match[3];
            break;
        }
      }
      else if (match = code_string.match(/^(?:\s*(\w+):)*\s*(?:(\w+)(\s+.*?)?)?$/)) {
        (label && match[1]) && this.warning(`label ${label} at offset ${this.offset} has been redefine, the previous has been ignored`);
        l && (label = l);
        code = match[2];
        para = match[3];
      }
      else if (match = code_string.match(/^\s*(%\w+)(\s+.*?)?/)) {
        code = match[1];
        para = match[2];
      }
      else {
        this.fatal("parse error")
      }

      if (label) {
        if (!this.code[this.segment]['label'][label]) {
          this.code[this.segment]['label'][label] = this.offset
        }
        else {
          if (this.code[this.segment]['label'][label] != this.offset)
            {this.error(`label ${label} redefine`)}
        }
      }

      if (code) {
        this.code[this.segment]['code'].push(new SingletonCode(code,para,label,comment))
        code.apply(this)
        this.offset += code.bytes
        code.getready()
        label = void(0)
      }
    });

    if (this.errorflag) {return}

    // expression and binary

    for (let key in this.code) {
      if (this.code.hasOwnProperty(key)) {
        let value = this.code[key];
        value['code'].forEach(code => {
          let message = code.getready()
          if (message) {
            thie.error(message)
          }
        })
      }
    }

    if (this.errorflag) {return}

    return this.code

  }

  // exception deal
  warning(info) {this.errorlist.push(`warning[${this.line + 1}]: ${info}`)}
  error(info) {this.errorlist.push(`error[${this.line + 1}]: ${info}`);this.errorflag = true}
  fatal(info) {this.errorlist.push(`fatal[${this.line + 1}]: ${info}`);throw `fatal error [${this.line + 1}]: ${info} ;then Assembler halt`}
}

module.exports = as
