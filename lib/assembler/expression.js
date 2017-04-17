// symbolic expression parsing and calculating

/* Expression

# Operators Supported and Operator precedence

  According to JavaScript Standard: [https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Operator_Precedence]
    20: Grouping              : ( ... )
    16: Logical NOT           : NOT, ~
        Unary Plus            : +
        Unary Negation        : -
    14: Multiplication        : *
        Division              : /, DIV
        Remainder             : %, MOD
    13: Addition              : +
        Subtraction           : -
    12: Bitwise Left Shift    : <<, SHL
        Bitwise Right Shift   : >>, SHR
    11: Less Than             : <, LT
        Less Than Or Equal    : <=, LE
        Greater Than          : >, GT
        Greater Than Or Equal : >=, GE
    10: Equality              : =, ==, EQ
        Inequality            : !=, <>, NE
    9:  Bitwise AND           : AND, &
    8:  Bitwise XOR           : XOR, ^
    7:  Bitwise OR            : OR, |

# Data type

 - Integer (signed)
   - dec: 10, 235, -123
   - hex: 23h, 0abh, 0x2a4
   - bin: 100010b, 0b0110101
 - String refer to data variable
   - alphabet(Case-sensitive), digital, underscore(_), dollar($)
   - digital start not allowed
 - Char with quotation mark '.'
   - only one char allowed or error throw, or escape character
   - escape characte: '\t', '\n', '\r', '\b', '\x**', '\'', '\\'
   - char will be parse as integer

*/

class Expression extends Array {
  args() { return Array.from(this.slice(1,this.length)) }
  sign() { return this[0] }
}
Expression.prototype.isExp = true

const splitRegexp = /(\(|\))|\b((?:NOT|DIV|MOD|AND|XOR|OR|SHL|SHR|EQ|NE|GE|LE|GT|LT))\b|(~|<<|>>|==|!=|<>|<=|>=|\+|\-|\*|\\|%|<|>|=|&|\||\^)|([a-zA-Z_\$\.][\w\$]*)|\b(0x[a-f\d]+|0b[0-1]+|[0-1]+b|[a-f\d]+h|\d+)\b|(\'(?:\\.|[^\'])*\')/gi

Expression.check = function(e) {
  let list = e.match(splitRegexp) || []
  if (list.join('').replace(/\s/g,'') !== e.replace(/\s/g,'')) {
    return false
  }
  return true
}

Expression.parse = function(e) {
  let list = e.match(splitRegexp) || []
  if (list.join('').replace(/\s/g,'') !== e.replace(/\s/g,'')) {
    throw `expression error with \`${e}', check with brackets and avoid float number`
  }
  list = list.reverse()
  const element = () => {
    let el = list.pop()
    if (!el) {
      return {
        type: 'brackets',
        value: ')'
      }
    }
    let m = el.match(RegExp(splitRegexp,'i'))
    if (m[1]) {
      return {
        type: 'brackets',
        value: m[1]
      }
    }
    else if (m[2] || m[3]) {
      let value, precedence
      let sign = (m[2] || m[3]).toUpperCase()
      switch (sign) {
        case '~':
        case 'NOT':
          [value, precedence] = ['~',16]
          break;
        case '*':
          [value, precedence] = ['*',14]
          break;
        case '/':
        case 'DIV':
          [value, precedence] = ['/',14]
        case '%':
        case 'MOD':
          [value, precedence] = ['%',14]
          break;
        case '+':
          [value, precedence] = ['+',13]
          break;
        case '-':
          [value, precedence] = ['-',13]
          break;
        case '<<':
        case 'SHL':
          [value, precedence] = ['<<',12]
          break;
        case '>>':
        case 'SHR':
          [value, precedence] = ['>>',12]
          break;
        case '<':
        case 'LT':
          [value, precedence] = ['<',11]
          break;
        case '>':
        case 'GT':
          [value, precedence] = ['>',11]
          break;
        case '<=':
        case 'LE':
          [value, precedence] = ['<=',11]
          break;
        case '>=':
        case 'GE':
          [value, precedence] = ['>=',11]
          break;
        case '==':
        case '=':
        case 'EQ':
          [value, precedence] = ['=',10]
          break;
        case '!=':
        case '<>':
        case 'NE':
          [value, precedence] = ['!=',10]
          break;
        case '&':
        case 'AND':
          [value, precedence] = ['&',9]
          break;
        case '^':
        case 'XOR':
          [value, precedence] = ['^',8]
          break;
        case '|':
        case 'OR':
          [value, precedence] = ['|',7]
          break;
        default:
          break;
      }
      return {
        type: 'operators',
        value: value,
        pre: precedence
      }
    }
    else if (m[4]) {
      return {
        type: 'variables',
        value: m[4]
      }
    }
    else if (m[5]) {
      let match = m[5].match(/0x([a-f\d]+)|([a-f\d]+)h|0b([0-1]+)|([0-1]+)b|(\d+)/i)
      let hex = match[1] || match[2]
      let bin = match[3] || match[4]
      let dec = match[5]
      let value = hex ? (parseInt(hex,16)) : (
        bin ? (parseInt(bin,2)) : (parseInt(dec))
      )
      return {
        type: 'integer',
        value: value
      }
    }
    else if (m[6]) {
      let char = m[6].match(/^'(.*?)'$/)[1]
      let match = char.match(/^(?:\\(.)|\\x([a-f\d]{2})|(.))$/i)
      if (!match) {throw 'invaild char format, multi char don\'t allow'}
      let value
      if (value = match[1]) {
        switch (value) {
          case 't':
            value = 9
            break;
          case 'b':
            value = 8
            break;
          case 'n':
            value = 10
            break;
          case 'r':
            value = 13
            break;
          default:
            value = value.charCodeAt()
            break;
        }
      }
      else if (match[2]) {
        value = parseInt(match[2],16)
      }
      else if (match[3]) {
        value = match[3].charCodeAt()
      }
      return {
        type: 'integer',
        value: value
      }
    }
    return
  }
  const group = () => {
    let el
    let needvar = true
    let op_stack = []
    let el_stack = []
    while ((el = element()).value !== ')') {
      if (needvar) {
        if (el.value === '(') {
          el_stack.push(group())
        }
        else if (el.type === 'operators') {
          if (['+','-','~'].includes(el.value)) {
            let op = ['plus','minus','not'][['+','-','~'].indexOf(el.value)]
            el = element()
            if (el.value === '(') {
              el = {value: group()}
            }
            else if (el.type === 'operators') {
              throw 'expect an element but an operators'
            }
            else if (el.value === ')') {
              throw 'expect an element but end of group'
            }
            let exp = Expression.from([op,el.value])
            el_stack.push(exp)
          }
          else {
            throw 'expect an element but an operators'
          }
        }
        else {
          el_stack.push(el)
        }
        needvar = !needvar
      }
      else {
        if (el.value === '(') {
          throw 'expect an operators but a bracket'
        }
        else if (el.type === 'operators') {
          op_stack.push(el)
        }
        else {
          throw 'expect an operators but an element'
        }
        needvar = !needvar
      }

    }

    if (needvar) {
      throw 'expect an element but end of group'
    }

    while (op_stack.length > 0) {
      let i = 0;
      let pre = 0;
      while (op_stack[i].pre < (op_stack[i+1] && op_stack[i+1].pre)) {
        if (op_stack[i+1]) {
          i++;
        }
      }
      let [l,r] = [el_stack[i], el_stack[i+1]].map((_) => (_.isExp ? _ : _.value))
      let op = op_stack[i]
      op_stack.splice(i,1)
      el_stack.splice(i,2,Expression.from([op.value,l,r]))
    }

    return el_stack[0]
  }
  let ans = group()
  if (!ans.isExp) {
    ans = ans.value
  }
  // TODO: Problem when flatten
  if (ans.isExp && ans[0] == "+") {
    let flat = (x) => {
      if (x.isExp) {
        switch (x.sign()) {
          case '+':
            return x.args().map((ex) => flat(ex)).reduce((a,b) => (a.concat(b)),[])
          default:
            return [x]
        }
      }
      else {
        return [x]
      }
    }
    ans = Expression.from(['+'].concat(flat(ans)))
  }
  return ans
}

Expression.prototype.toString = function() {
    if (['plus','minus','not'].includes(this[0])) {
      switch (this[0]) {
        case 'plus':
          return (`+${this[1]}`)
          break;
        case 'minus':
          return (`-${this[1]}`)
          break;
        case 'not':
          return (`~${this[1]}`)
          break;
        default:
          break;
      }
    }
    return this.args().map((el) => {
      if (el.isExp) {
        if (['*','/','%'].includes(this[0])) {
          if (['*','/','%'].includes(el[0])) {
            return (`${el.toString()}`)
          }
        }
        if (['+','-'].includes(this[0])) {
          if (['*','/','%','+','-'].includes(el[0])) {
            return (`${el.toString()}`)
          }
        }
        return (`(${el.toString()})`)
      }
      else {
        return el.toString()
      }
    }).join(' '+this.sign()+' ')
  }

Expression.table = function(x) {
  let flat = (x) => {
    if (x.isExp) {
      return x.args().map((ex) => flat(ex)).reduce((a,b) => (a.concat(b)),[])
    }
    else {
      return [x]
    }
  }
  return flat(x).filter(a => (typeof(a) === 'string'))
}

Expression.prototype.calc = function(table = {}) {

  let calc = (x) => {
    if (x.isExp) {
      switch (x.sign()) {
        case '+':
          return x.args().map((e) => calc(e,table)).reduce((a,b) => (a+b),0)
        case '-':
          return calc(x[1]) - calc(x[2])
        case '*':
          return calc(x[1]) * calc(x[2])
        case '/':
          return parseInt(calc(x[1]) / calc(x[2]))
        case '%':
          return calc(x[1]) % calc(x[2])
        case 'not':
          return ~ calc(x[1])
        case 'plus':
          return calc(x[1])
        case 'minus':
          return -calc(x[1])
        case '<<':
          return calc(x[1]) << calc(x[2])
        case '>>':
          return calc(x[1]) >> calc(x[2])
        case '<':
          return (calc(x[1]) < calc(x[2])) ? 0xffff : 0
        case '>':
          return (calc(x[1]) > calc(x[2])) ? 0xffff : 0
        case '<=':
          return (calc(x[1]) <= calc(x[2])) ? 0xffff : 0
        case '>=':
          return (calc(x[1]) >= calc(x[2])) ? 0xffff : 0
        case '=':
          return (calc(x[1]) === calc(x[2])) ? 0xffff : 0
        case '!=':
          return (calc(x[1]) !== calc(x[2])) ? 0xffff : 0
        case '&':
          return calc(x[1]) & calc(x[2])
        case '|':
          return calc(x[1]) | calc(x[2])
        case '^':
          return calc(x[1]) ^ calc(x[2])
        default:
          throw ("invaild operater " + x[0])
      }
    }
    else {
      return x.calc(table)
    }
  }

  return calc(this)
}

Expression.prototype.vaild = function(table = {}) {

  let check = (exp) => {
    switch (typeof(exp)) {
      case 'object':
        return exp.args().map(check).reduce((a,b) => (a && b),true)
      case 'string':
        if (typeof(table[exp]) === 'number') {
          return true
        }
        else {
          return false
        }
      case 'number':
        return true
      default:
        return false
    }
  }

  return check(this)
}

Number.prototype.calc = function() {
  return this
}

String.prototype.isExp = true

String.prototype.vaild = function(table = {}) {
  if (typeof(table[this]) === 'number') {
    return true
  }
  else {
    return false
  }
}

String.prototype.calc = function(table = {}) {
  if (typeof(table[this]) === 'number') {
    return table[this]
  }
  else {
    throw `variable \`${this}' not defined`
  }
}

module.exports = Expression
