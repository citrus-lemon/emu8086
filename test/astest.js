const as = require('../lib/assembler/as.js')
let codeSource
let assembler



codeSource = `
  assume cs:cseg,ds:dseg ; hello
  mov ax,bx
`

assembler = new as().loadSource(codeSource)
global.asm = assembler
assembler.assemble()
