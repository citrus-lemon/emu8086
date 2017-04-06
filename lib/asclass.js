const AssemblerCodeSet = require('./ascodeset.js')
const {exp,calc,format,vaild} = require('./expression.js')
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

class Element {
  constructor(str, word, me) {
    this.str = str.trim()
    this.word = word
    this.info = {}
    if (me) {
      this.bind(me)
    }
    else {
      this.self && this.bind(this.self)
    }
    this.parse()
  }

  bind(obj) {
    this.self = obj
    ["error","warning","fatal"].forEach(fn => {
      this[fn] = (...args) => this.self[fn](...args)
    })
  }

  parse() {
    let _
    if ((_ = reg_tab.indexOf(this.str.toUpperCase())) + 1) {
      this.info.type = "reg"
      this.info.word = parseInt(_/8)
      this.info.name = this.str.toUpperCase()
      this.info.code = _ % 8
    }
    else if ((_ = reg_seg.indexOf(this.str.toUpperCase())) + 1) {
      this.info.type = "seg"
      this.info.word = 1
      this.info.name = this.str.toUpperCase()
      this.info.code = _
    }
    else if (_ = this.str.match(/^(?:(word|byte)\s+)*(?:(\w+)\s*)*(?:\[(.*?)\])$/i)) {
      this.info.type = "mem"
      switch (('' + _[1]).toUpperCase()) {
        case 'WORD':
          this.info.word = 1
          break;
        case 'BYTE':
          this.info.word = 0
          break;
        default:
          this.info.word = void(0)
          break;
      }
      let value = _[3] + (_[2] ? `+${_[2]}` : '')
      if (format(value)) {
        value = exp(value)
      }
      else {
        error("wrong expression ["+exp+"]")
      }
      let mod_reg
      if (typeof(value) === 'object') {
        mod_reg = value.map((e) => (typeof(e) === 'string' ? e.toUpperCase() : void(0)))
          .filter((e) => ["BX","BP","SI","DI"].includes(e))
          .sort()
          .reduce((a,b) => (a*5+([ 'BX', 'BP', 'SI', 'DI' ].indexOf(b)+1)),0)
      }
      else {
        mod_reg = 0
      }
      mod_reg = rm_tab.indexOf(mod_reg)
      if (mod_reg == -1) {error("wrong register group")};
      ;(typeof(value) === 'object') && (value = value.filter((e) => !["BX","BP","SI","DI"].includes((''+e).toUpperCase())));
      let table
      if (this.self) {
        if ([2,3,6].includes(mod_reg)) {
          table = this.self.code['stack'].label
        }
        else {
          table = this.self.code['data'].label
        }
        table = Object.assign(table,this.self.datalabel)
      }
      vaild(value,table) && (value = calc(value, table));
      this.info.mod_reg = mod_reg

      if (typeof(value) === 'number') {
        if (value == 0) {
          this.info.mod = this.info.size = 0
        }
        else {
          let a = (value >= 0) ? value : (-value)-1
          if (a/0x100 < 1) {
            this.info.mod = this.info.size = 1
          }
          else if (a/0x10000 < 1) {
            this.info.mod = this.info.size = 2
          }
          else {
            this.warning("disp too large")
            this.info.mod = this.info.size = 2
          }
        }
      }
      else {
        this.info.mod = this.info.size = 2
      }

      this.info.value = this.info.disp = value
      this.info.rm = mod_reg
      if (mod_reg === 8) {
        this.info.rm = 6
        this.info.mod = 0
        this.size = 2
      }

    }
    else if (format(this.str)) {
      this.info.type = "imm"
      let table = this.self.code['data'].label
      table = Object.assign(table,this.self.datalabel)
      let value = this.str
      if (format(value)) {
        value = exp(value)
      }
      vaild(value,table) && (value = calc(value, table));
      this.info.value = value
    }

  }

  equal() {

  }

  reg_code() {
    if (["reg","seg"].includes(this.info.type)) {
      return this.info.code
    }
  }

  rm_mod() {
    switch (this.info.type) {
      case "mem":
        if (this.self) {
          if ([2,3,6].includes(this.info.mod_reg)) {
            table = this.self.code['stack'].label
          }
          else {
            table = this.self.code['data'].label
          }
          table = Object.assign(table,this.self.datalabel)
        }
        vaild(this.info.disp,table) ? (this.info.disp = calc(this.info.disp, table)) : (this.error(`no enough label`));
        return [this.info.mod,this.info.rm,this.info.disp]
        break;
      case "reg":
        return [3,this.info.code]
        break;
      default:
        break;
    }
  }

  ready() {
    switch (this.info.type) {
      case 'reg':
      case 'seg':
        return true
      case 'imm':
      case 'mem':
        if (this.self) {
          if ([2,3,6].includes(this.info.mod_reg)) {
            table = this.self.code['stack'].label
          }
          else {
            table = this.self.code['data'].label
          }
          table = Object.assign(table,this.self.datalabel)
        }
        return vaild(this.info.value,table)
      default:
        break;
    }
  }

  toString() {

  }
}

class SingletonCode {
  constructor(code,opts,label,comment) {
    this.code = code.toUpperCase()
    this.parameter = opts
    this.label = label
    this.comment = comment
    this.detail = {}
    this.binary = nil
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
        code['method'].bind(me)(this);
        return;
      }
    })
  }

}

module.exports = {Element, SingletonCode}
