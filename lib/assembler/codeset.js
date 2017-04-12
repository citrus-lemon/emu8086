// assembler pesudo and code instruction set
let AssemblerCodeSet = []
const pesudo = (sign,method) => AssemblerCodeSet.push({sign,method,type:"pesudo"})
const code   = (sign,method) => AssemblerCodeSet.push({sign,method,type:"code"})

// pesudo code

// instruction

// module
module.exports = AssemblerCodeSet
