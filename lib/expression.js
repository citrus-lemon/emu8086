// string expression to tree

const exp = (e) => {
  let list = e.match(/(?:[\(\)+\-*\/]|\w+|\'(?:\\\'|.)\')/g) || []
  if (list.join('') !== e.replace(/\s/g,'')) {
    throw `expression error with ${e}, check with brackets and avoid float number`
  }
  let op_stack = []
  let nu_stack = []
  let bl_stack = [0]
  let match
  list.forEach((el) => {
    if (['+','-','*','/'].includes(el)) {
      op_stack.push(el)
    }
    else if (['(',')'].includes(el)) {
      switch (el) {
        case '(':
          op_stack.push('(')
          bl_stack.push(nu_stack.length)
          break;
        case ')':
          let f_point = bl_stack.pop()
          let a_list = []
          while (op_stack[op_stack.length-1] !== '(') {
            let op = op_stack.pop()
            switch (op) {
              case '+':
                nu_stack.length > f_point && a_list.push(nu_stack.pop())
                break;
              case '-':
                nu_stack.length > f_point && a_list.push(['-',0,nu_stack.pop()])
                break;
              default:
                break;
            }
          }
          nu_stack.length > f_point && a_list.push(nu_stack.pop())
          switch (a_list.length) {
            case 0:
              throw "no element in bracket"
              break;
            case 1:
              nu_stack.push(a_list[0])
              break;
            default:
              nu_stack.push(['+'].concat(a_list.reverse()))
              break;
          }
          op_stack.pop()
          if (['*','/'].includes(op_stack[op_stack.length-1])) {
            let op = op_stack.pop()
            let [b,a] = [nu_stack.pop(),nu_stack.pop()]
            nu_stack.push([op,a,b])
          }
          break;
        default:
          break;
      }
    }
    else if (match = el.match(/^(0x\d[a-f0-9]*|\d[a-f0-9]*h)|0b([0-1]+)|([0-1]+b)|(\d+)|\'(\\\'|.)\'$/i)) {
      let value = match[1] ? (parseInt(match[1],16)) : (
        match[2] ? (parseInt(match[2],2)) : match[3] ? (parseInt(match[3],2)) : (
          match[4] ? (parseInt(match[4])) : (
            (match[5] == "\\'") ? 39 : match[5].charCodeAt()
          )
        )
      )
      nu_stack.push(value)
      if (['*','/'].includes(op_stack[op_stack.length-1])) {
        let op = op_stack.pop()
        let [b,a] = [nu_stack.pop(),nu_stack.pop()]
        nu_stack.push([op,a,b])
      }
    }
    else if (match = el.match(/^\w+$/)) {
      let value = el
      nu_stack.push(value)
      if (['*','/'].includes(op_stack[op_stack.length-1])) {
        let op = op_stack.pop()
        let [b,a] = [nu_stack.pop(),nu_stack.pop()]
        nu_stack.push([op,a,b])
      }
    }
  })
  let f_point = bl_stack.pop()
  let a_list = []
  while (op_stack[op_stack.length-1]) {
    let op = op_stack.pop()
    switch (op) {
      case '+':
        nu_stack.length > f_point && a_list.push(nu_stack.pop())
        break;
      case '-':
        nu_stack.length > f_point && a_list.push(['-',0,nu_stack.pop()])
        break;
      default:
        break;
    }
  }
  nu_stack.length > f_point && a_list.push(nu_stack.pop())
  switch (a_list.length) {
    case 0:
      throw "no element in bracket"
      break;
    case 1:
      nu_stack.push(a_list[0])
      break;
    default:
      nu_stack.push(['+'].concat(a_list.reverse()))
      break;
  }
  let ans = nu_stack.pop()
  if (Array.isArray(ans) && ans[0] == "+") {
    let flat = (x) => {
      if (Array.isArray(x)) {
        switch (x[0]) {
          case '+':
            return x.slice(1, x.length).map((ex) => flat(ex)).reduce((a,b) => (a.concat(b)),[])
          case '-':
            return [x[1],['-',0,x[2]]]
          default:
            return [x]
        }
      }
      else {
        return [x]
      }
    }
    ans = ['+'].concat(flat(ans))
  }
  return ans
}

const calc = (exp,table={}) => {
  switch (typeof exp) {
    case 'number':
      if (!Number.isInteger(exp)) {throw "float not allow"}
      return exp
    case 'object':
      if (!Array.isArray(exp)) {throw "invaild object"}
      switch (exp[0]) {
        case '+':
          return exp.slice(1, exp.length).map((e) => calc(e,table)).reduce((a,b) => (a+b),0)
        case '-':
          return calc(exp[1],table) - calc(exp[2],table)
        case '*':
          return calc(exp[1],table) * calc(exp[2],table)
        case '/':
          return parseInt(calc(exp[1],table) / calc(exp[2],table))
        default:
          throw ("invaild operater " + exp[0])
      }
      break;
    case 'string':
      if (!table[exp]) {throw `undefined value "${exp}"`}
      return calc(table[exp],table)
    case 'undefined':
      throw "undefined value"
    default:
      throw "invaild input type"
  }
}

const format = (e) => {
  let list = e.match(/(?:[\(\)+\-*\/]|\w+|\'(?:\\\'|.)\')/g) || []
  return (list.join('') === e.replace(/\s/g,''))
}

const vaild = (exp,table = {},done = []) => {
  if (typeof(exp) === 'number') {return true}
  // TODO: vaild
  return true
}

module.exports = {exp,calc,format,vaild}
