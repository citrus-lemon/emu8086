const as = require('../lib/assembler/as.js')
let codeSource
let assembler



codeSource = `
  mov ax,203h
`

assembler = new as().loadSource(codeSource)
global.asm = assembler
assembler.assemble()
console.log(assembler.binary().map(e => e.toString(16)))
