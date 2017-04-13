const exp = require('../lib/assembler/expression.js')

let formula = '3*6+(4 and his)+4'
let ans = exp.parse(formula)
console.log(ans)
console.log(ans.toString())
