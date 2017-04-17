// assembler pesudo and code instruction set
let AssemblerCodeSet = []
const { splitArgs, Element } = require('./classes.js')
const pesudo = (sign,method) => AssemblerCodeSet.push({sign,method,type:"pesudo"})
const code   = (sign,method) => AssemblerCodeSet.push({sign,method,type:"code"})

// pesudo code

// instruction

code("MOV", (code,asm,error) => {
  let [obj,src] = splitArgs(code.parameter, error).argsmap(Element.Data)
  if (obj.type === "imm") {
    // object cannot be immediate data
    error.error('object cannot be immediate data')
  }
  else if (src.type === "imm") {
    // Immediate to Register/Memory
    if (!obj.word) {
      obj.error.error('operation size not specified')
    }
    else if (obj.word > 1) {
      obj.error.error('operation size illegal in `mov\' instruction')
    }
    else {
      if (obj.type === "reg") {
        this.ready = src.ready
      }
      else if (obj.type === "seg") {
        obj.error.error('cannot assign immediate data to segment register')
      }
      else {

      }
    }
  }
})

// module
module.exports = AssemblerCodeSet
