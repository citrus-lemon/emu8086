const exp = require('../lib/assembler/expression.js')

let formula = ' - (3<<d)- bx + si'
let ans = exp.parse(formula)
console.log(ans)
console.log(ans.toString())

ans = exp.parse(
  '12+4*c%2'
)
console.log(ans)
console.log(ans.vaild())
console.log(ans.vaild({c:7}))
console.log(ans.calc({c:7}))
