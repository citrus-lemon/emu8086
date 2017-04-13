const exp = require('../lib/assembler/expression.js')

let formula = 'a*b+(e and his)+q'
let ans = exp.parse(formula)
// console.log(ans.toString())

ans = exp.parse(
  '12+4*c%2'
)
console.log(ans)
console.log(ans.calc({c:7}))
