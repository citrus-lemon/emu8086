// define available classes in assembler
const EXP = require('./expression.js')
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
    return this.me && (this.line !== void(0)) && this.me.source[this.line].slice(
      (this.column || 0),
      this.length ? (
        this.length + (this.column || 0)
      ) : (this.me.source[this.line].length + (this.column || 0))
    )
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

  currentline() {
    return new Exception(this.me,this.line)
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

  warning(detail) {
    let exception = this.clone()
    exception.type = 'warning'
    exception.detail = detail
    exception.me.errorlist.push(exception)
  }

  fatal(detail) {
    let exception = this.clone()
    exception.type = 'fatal'
    exception.detail = detail
    exception.me.errorlist.push(exception)
    throw 'assembler procedure fatal error'
  }

  toString() {
    return (`${this.type}[${this.line + 1}:${(this.column || 0)+1}]:${this.detail}`)
  }
}

class Segment {
  constructor(name) {
    this.codes = []
    this.label = []
    this.name = name
    this.offset = 0
  }

  push(code) {
    if (code.bytes !== void(0)) {
      this.offset += code.bytes
    }
    else {
      code.error.fatal('code error')
    }
    this.codes.push(code)
  }

  labelList(a) {
    let list = {}
    this.label.map((el) => {
      if (a) {list[name] = el}
      else {list[name] = el.offset}
    })
    return list
  }

  compile() {
    this.raw_binary = []
    this.codes.map((code) => {
      this.raw_binary.push(...code.binary())
    })
  }

  binary() {
    return this.raw_binary
  }
}

class Label {
  constructor(name, offset, type, length) {
    this.name = name;
    this.offset = offset;
    this.type = this.type;
    this.length = this.length || 1;
    this.size = this.type && (this.type * this.length);
  }
}

class DataElement {
  constructor(str, error = defaultException) {
    let name = str.trim()
    this.error = error
    // parse
    let _
    if ((_ = reg_tab.indexOf(name.toUpperCase())) + 1) {
      this.type = "reg"
      this.word = parseInt(_/8)
      this.name = str.toUpperCase()
      this.code = _ % 8
      this.size = 0
    }
    else if ((_ = reg_seg.indexOf(name.toUpperCase())) + 1) {
      this.type = "seg"
      this.word = 1
      this.name = str.toUpperCase()
      this.code = _
      this.size = 0
    }
    // else if ((_ = chooseSegment('data',error).labelList(1)[name]) !== void(0)) {
    //   this.type = "mem"
    //   this.word = _.size && (_.size-1);
    //   this.raw_value = _.offset
    // }
    else if (_ = name.match(/^\s*(?:(dword|word|byte)\b\s*)?(?:(ptr)\b\s*)?(?:(\w+)\b\s*)?\[(.*?)\]$/i)) {
      this.type = "mem"
      switch (_[2] || _[1]) {
        case 'dword':
          this.word = 2
          this.error.warning('dword will not working in a memory element')
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
      let exp = _[4] + (_[3] ? ('+' + _[3]) : "")
      if (!EXP.check(exp)) {
        this.error.error(`expression illegal \`${exp}'`)
      }
      else {
        exp = EXP.parse(exp)
      }
      let mod_reg
      if (exp.isExp && (exp.sign() === '+')) {
        mod_reg = exp.map((e) => (typeof(e) === 'string' ? e.toUpperCase() : void(0)))
          .filter((e) => ["BX","BP","SI","DI"].includes(e))
          .sort()
          .reduce((a,b) => (a*5+([ 'BX', 'BP', 'SI', 'DI' ].indexOf(b)+1)),0)
      }
      else {
        mod_reg = 0
      }
      mod_reg = rm_tab.indexOf(mod_reg)
      if (mod_reg == -1) {this.error.error("wrong register group")};
      ;(exp.isExp && (exp.sign() === '+')) && (exp = exp.filter((e) => !["BX","BP","SI","DI"].includes((''+e).toUpperCase())));
      let table
      if ([2,3,6].includes(mod_reg)) {
        table = this.error.me.chooseSegment('stack').labelList()
      }
      else {
        table = this.error.me.chooseSegment('data').labelList()
      }
      table['$'] = this.error.me.chooseSegment().offset
      if (exp.isExp && exp.vaild(table)) {
        exp = exp.calc(table)
      }
      this.mod_reg = mod_reg

      // range check
      if (typeof(exp) === 'number') {
        if (exp === 0) {
          this.mod = this.size = 0
        }
        else {
          let a = (exp >= 0) ? exp : (-exp-1)
          if (a/0x100 < 1) {
            this.mod = this.size = 1
          }
          else if (a/0x10000 < 1) {
            this.mod = this.size = 2
          }
          else {
            error.warning('disp too large')
            this.mod = this.size = 2
          }
        }
      }
      else {
        this.mod = this.size = 2
      }

      this.raw_value = this.disp = exp
      this.rm = mod_reg
      if (mod_reg === 8) {
        this.rm = 6
        this.mod = 0
        this.size = 2
      }
    }
    else if (_ = name.match(/^(?:(length|size|type)\s+)?(.*?)$/i)) {
      this.type = "imm"
      let table = this.error.me.chooseSegment('data').labelList()
      let value = name
      if (EXP.check(name)) {
        value = EXP.parse(value)
      }
      else {
        this.error.error('expression error')
      }
      if (value.isExp && value.vaild(table)) {
        value = value.calc(table)
      }
      this.raw_value = value
    }
  }

  ready() {
    let table
    if ([2,3,6].includes(this.mod_reg)) {
      table = this.error.me.chooseSegment('stack').labelList()
    }
    else {
      table = this.error.me.chooseSegment('data').labelList()
    }
    return this.raw_value.isExp ? this.vaild(table) : true
  }

  value() {
    let table
    if ([2,3,6].includes(this.mod_reg)) {
      table = this.error.me.chooseSegment('stack').labelList()
    }
    else {
      table = this.error.me.chooseSegment('data').labelList()
    }
    return this.raw_value = (this.raw_value.isExp ? this.calc(table) : this.raw_value)
  }

  data(i) {
    let v = this.value()
    if (this.type === "mem" && i == -1) {i = this.size - 1}
    let ans = []
    for (let a=0; a<=i;a++) {
      ans.push((v & ((1 << 8*(1+a)) - (1 << 8*a))) >> 8*a)
    }
    return ans
  }

  rm_mod(w) {
    if (this.type === "reg") {
      return [3,this.code,[]]
    }
    else if (this.type === "mem") {
      return [this.mod,this.rm,this.data(-1)]
    }
    else {
      this.error.error(`${this.type} type cannot have rm_mod arguments`)
      // throw 'rm_mod no allow'
    }
  }
}

class ProcElement {
  constructor(str, error = defaultException) {

  }
}

class SingletonCode {
  constructor(code,opts,label,comment,error = defaultException) {
    this.code = code.toUpperCase()              // Instruction Mnemonic
    this.parameter = opts                       // Parameters of Instruction
    this.label = label                          // Label of each code
    this.comment = comment                      // Comment in line end with `;' and `#'
    this.save = true                            // false if segment define or something don't need be saved in segments
    this.detail = {}                            // Explaination of code
    this.bytes                                  // bytes of code, need unsure when parse
    this.binary = void(0)                       // the final binary after compiled
    this.error = error                          // Exception Object
    this.ready = () => "initialize"             // nil if ready, detail if not ready
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

  apply(me, acs) {
    for (let i = 0; i < acs.length; i++) {
      let code = acs[i];
      if (
        (
          (typeof(code['sign']) === 'string') &&
          (code['sign'] === this.code)
        ) ||
        (
          (typeof(code['sign']) === 'object') &&
          (code['sign'].match(this.code))
        )
      ) {
        code['method'].bind(me)(this,me,this.error);
        this.type = code.type
        return;
      }
    }
    this.error.currentline().error('no instruction matched')
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

  if (parameter && parameter.trim() === '') {
    parameter = void(0)
  }

  if (code) {
    label = this.label
    this.label = void(0)
    let onecode = new SingletonCode(code, parameter, label, comment, error.produce(codestr.indexOf(parameter),parameter && parameter.length))
    onecode.apply(this, this.CodeSet)
    this.lastcode = onecode
    return onecode
  }
  else {
    this.lastcode && comment && (this.lastcode.comment += ("\n"+comment))
    if (!comment || label) {
      this.lastcode = void(0)
    }
  }

}

function chooseSegment(seg, error = defaultException) {
  if (seg === 'all') {
    if (this.segment_mode === 0) return [this.current_segment]
    return Object.keys(this.segment_name_table).map((name) => this.segment_name_table[name].segment)
  }
  if (!seg || !this.segment_mode) {
    // return current segment
    if (!this.current_segment) {
      if (this.segment_mode === 1) {
        error.fatal('code write outside of segment')
      }
      this.current_segment = new Segment('main')
      this.segment_mode = 0
    }
    return this.current_segment;
  }
  switch (seg.toString().toLowerCase()) {
    case 'code':
      return this.segment_name_table['CS'].segment
    case 'data':
      return this.segment_name_table['DS'].segment
    case 'stack':
      return this.segment_name_table['SS'].segment
    case 'extra':
      return this.segment_name_table['ES'].segment
    default:
      err.error(`${seg} cannot be chosen, because of invaild segment type`)
      break;
  }
}

function assumeFirst() {
  for (let i = 0; i < this.source.length; i++) {
    let code = this.source[i];
    let match = code.match(/^\s*assume(?:\s+(.*?))?(?:(?:;|#).*?)?$/)
    if (match) {
      let par = match[1] || ""
      let index = this.source[i].indexOf(par)
      let length = par.length
      let error = this.exception.produce(i).produce(index,length)
      this.source[i] = ''
      this.segment_name_table = {}
      splitArgs(par, error).argsmap((el,err) => {
        let _ = el.match(/^\s*(\w+)\s*:\s*(\w+)\s*$/)
        if (_) {
          let seg = _[1].toUpperCase()
          let name = _[2].toUpperCase()
          // segment name case-insensitive
          if (['CS','DS','SS','ES'].includes(seg)) {
            if (this.segment_name_table[seg]) {
              err.error(`${seg} has been redefined`)
            }
            else {
              this.segment_name_table[seg] = {
                name: name,
                segment: void(0)
              }
            }
          }
          else {
            err.error(`${seg} is not a vaild segment`)
          }
        }
        else {
          err.error('assume error, error format')
        }
      })

      ;['CS','DS','SS','ES'].map((el) => {
        if (!this.segment_name_table[el]) {
          error.currentline().warning(`${el} has not been assumed`)
        }
      })

      this.segment_mode = 1

      return;
    }
  }

  // no assume command defined
  // default segment name used
  // segment name case-insensitive
  /* Segment Code, Data, Stack, Extra */

  this.segment_name_table = {}
  let names_of_default_segments = ['CODE','DATA','STACK','EXTRA'];
  ;['CS','DS','SS','ES'].map((seg,i) => {
    this.segment_name_table[seg] = {
      name: names_of_default_segments[i],
      segment: void(0)
    }
  })

}

function splitArgs(str, error = defaultException, number = -1) {
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
  ans.argsmap = function(fn) {
    return ans.map((a,i) => (fn(a,range[i],i,ans)))
  }
  if (number + 1) {
    if (number) {
      ans.length !== number && error.error(`expect ${number} arguments but get ${ans.length}`)
    }
    else {
      if (ans.length <= 1 && ans[0].trim()) {
        let a = []
        a.argsmap = () => []
        return a
      }
      else {
        error.error('expect no arguments but get one')
      }
    }
  }
  return ans
}

function marco(str) {
  this.marco_list = this.marco_list || {};
  let reg = /\b(\w+)\b/g;
  let match
  while ((match = reg.exec(str)) !== null) {
    let substr = match[0];
    if (['not','div','mod','shl','shr','lt','le','gt','ge','eq','ne','and','xor','or','bp','bx','si','di'].includes(substr.toLowerCase())) {
      continue;
    }
    if (this.marco_list[substr] !== void(0)) {
      str = str.slice(0,match.index) + (` ${this.marco_list[substr]} `) + str.slice(match.index + substr.length)
    }
  }
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
