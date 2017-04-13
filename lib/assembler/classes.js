// define available classes in assembler
const AssemblerCodeSet = require('./codeset.js')
const exp = require('./expression.js')
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
        "AL","CL","DL","BL","AH","CH","DH","BH",
        "AX","CX","DX","BX","SP","BP","SI","DI"
      ]
const reg_seg = ["ES","CS","SS","DS"]
const rm_tab = [
        8, // ["BX","SI"]
        9, // ["BX","DI"]
        13,// ["BP","SI"]
        14,// ["BP","DI"]
        3, // ["SI"]
        4, // ["DI"]
        2, // ["BP"]
        1, // ["BX"]
        0  // []
      ]
const w_tag = ["byte","word"]

const defaultException = {
  options: () => ({}),
  string: () => {throw 'defaultException have no default string'},
  produce: () => defaultException,
  error: (info) => console.error(`error: ${info}`),
  warning: (info) => console.error(`warning: ${info}`),
  fatal: (info) => {throw (`warning: ${info}`)}
}

class Exception {
  constructor(me,line,column,length) {
    this.me = me
    this.line = line
    this.column = column
    this.length = length
  }

  options() {
    return this.me.options
  }

  string() {
    return this.me && this.line && this.me.source[this.line].slice((this.column || 0),this.length && (this.length + (this.column || 0)))
  }

  produce(...args) {
    let line, column, length
    if (this.line === void(0)) {
      [line, column, length] = args
    }
    else {
      line = this.line
      if (args[0] <= 0) {
        return this.clone()
      }
      if (this.column === void(0)) {
        [column, length] = args
      }
      else {
        if (this.length === void(0)) {
          column = this.column + args[0]
          length = args[1]
        }
        else {
          if (args[0] >= this.length) {return}
          column = this.column + args[0]
          length = (args[1] && ((this.column + args[1]) < this.length)) ? args[1] : (this.length - args[0])
        }
      }
    }
    return new Exception(this.me,line,column,length)
  }

  clone() {
    return new Exception(this.me,this.line,this.column,this.length)
  }

  error(detail) {
    let exception = this.clone()
    exception.type = 'error'
    exception.detail = detail
    exception.me.errorflag = true
    exception.me.errorlist.push(exception)
  }

  warning() {
    let exception = this.clone()
    exception.type = 'warning'
    exception.detail = detail
    exception.me.errorlist.push(exception)
  }

  fatal() {
    let exception = this.clone()
    exception.type = 'fatal'
    exception.detail = detail
    exception.me.errorlist.push(exception)
    throw 'fatal error'
  }
}

class Segment {
  constructor(name) {
    this.codes = []
    this.push = this.codes.push
    this.label = []
    this.name = name
  }

  labelList() {

  }
}

class DataElement {
  constructor(str, error = defaultException) {
    let name = str.trim()
    // parse
    let _
    if ((_ = reg_tab.indexOf(name.toUpperCase())) + 1) {
      this.type = "reg"
      this.word = parseInt(_/8)
      this.name = str.toUpperCase()
      this.code = _ % 8
    }
    else if ((_ = reg_seg.indexOf(name.toUpperCase())) + 1) {
      this.type = "seg"
      this.word = 1
      this.name = str.toUpperCase()
      this.code = _
    }
    else if (_ = name.match(/^\s*(?:(dword|word|byte)\s+)?(?:(ptr)\s+)?(?:(\w+)\s*)?\[(.*?)\]$/i)) {
      switch (_[2] || _[1]) {
        case 'dword':
          this.word = 2
          error.warning('dword will not working in a memory element')
          break;
        case 'word':
          this.word = 1
          break;
        case 'byte':
          this.word = 0
          break;
        default:
          this.word = void(0)
          break;
      }
      // TODO
    }
    else if (_ = name.match(/^(?:(length|size|type)\s+)?(.*?)$/i)) {
      // TODO
    }
  }
}

class ProcElement {
  constructor(str, error = defaultException) {

  }
}

class SingletonCode {
  constructor(code,opts,label,comment,error = defaultException) {
    this.code = code.toUpperCase()
    this.parameter = opts
    this.label = label
    this.comment = comment
    this.detail = {}
    this.binary = nil
    this.error = error
    this.ready = () => "initialize"
  }

  annotate(opt) {
    this.detail = this.detail.concat(opt)
  }

  getready() {
    if (!this.ready()) {
      return this.binary = this.compile()
    }
    else {
      return;
    }
  }

  apply(me) {
    AssemblerCodeSet.forEach(code => {
      if (
        (
          (typeof(code[sign]) === 'string') &&
          (code[sign] === this.code)
        ) ||
        (
          (typeof(code[sign]) === 'object') &&
          (code[sign].match(this.code))
        )
      ) {
        code['method'].bind(me)(this,me,this.error);
        return;
      }
    })
  }

}

// functions

function parseCode(codestr, error = defaultException) {
  if (!codestr) {
    codestr = error.string()
  }
  let match = codestr.match(/^((?:\'(?:(?:\\.)|[^\.])*?\'|[^;#])*)(?:[;#]\s*(.*))?$/)
  let code_string = match[1]
  let comment = match[2]

  let label, code, parameter

  if (match = code_string.match(/^\s*(?:([a-zA-Z_\.]\w*):?\s+)?(segment|ends|d[b|w|d|q|t]|equ|=|proc|endp|times)(?:\s+(.*?))?$/i)) {
    label = match[1]
    code = match[2]
    parameter = match[3]
  }
  else if (match = code_string.match(/^(?:\s*([a-zA-Z_\.]\w*):)?\s*(?:([%\w]\w*)(?:\s+(.*?))?)?$/i)) {
    label = match[1]
    code = match[2]
    parameter = match[3]
  }

  if (label) {
    if (this.label) {
      error.warning(`label ${label} at offset ${this.offset} has been redefine, the previous ${this.label} has been ignored`)
    }
    this.label = label
  }

  if (parameter.trim() === '') {
    parameter = void(0)
  }

  if (code) {
    label = this.label
    this.label = void(0)
    let onecode = new SingletonCode(code, parameter, label, comment, error.produce(codestr.indexOf(parameter),parameter && parameter.length))
    onecode.apply(this)
    this.lastcode = onecode
  }
  else {
    this.lastcode && comment && (this.lastcode.comment += ("\n"+comment))
    if (!comment || label) {
      this.lastcode = void(0)
    }
  }

}

function chooseSegment(seg, error = defaultException) {

}

function assumeFirst() {
  for (let i = 0; i < this.source.length; i++) {
    let code = this.source[i];
    let match = code.match(/^\s*assume\s+(.*?)(?:(?:;|#).*?)?$/)
    if (match) {
      let par = match[1]
      let index = this.source[i].indexOf(par)
      let length = par.length
      this.source[i] = ''
      splitArgs(par, this.exception.produce(i).produce(index,length)).map((el,err) => {
        let _ = el.match(/^\s*(\w+)\s*:\s*(\w+)\s*$/)
        if (_) {
          // TODO
        }
        else {
          err.error('assume error, error format')
        }
      })
      return;
    }
  }
}

function splitArgs(str, error = defaultException) {
  let ans = []
  let range = []
  let reg = /((?:\'(?:\\.|[^\'])*\'|[^,])+)\s*(?:,|$)/g
  let match
  while ((match = reg.exec(str)) !== null) {
    let substr = match[1]
    let index = match.index
    let length = substr.length
    let suberr = error.produce(index,length)
    ans.push(substr)
    range.push(suberr)
  }
  let map = ans.map
  ans.map = fn => map((a,i) => (fn(a,range[i],i,ans)))
  return ans
}

// namespace

const Element = {
  Data: (...args) => (new DataElement(...args)),
  Proc: (...args) => (new ProcElement(...args))
}

module.exports = {
  Segment, DataElement, ProcElement, SingletonCode, Exception,
  parseCode, chooseSegment, splitArgs, assumeFirst,
  Element
}
