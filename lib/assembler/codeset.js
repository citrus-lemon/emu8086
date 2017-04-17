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
    if (obj.word === void(0)) {
      obj.error.error('operation size not specified')
    }
    else if (obj.word > 1) {
      obj.error.error('operation size illegal in `mov\' instruction')
    }
    else {
      if (obj.type === "reg") {
        code.ready = src.ready
        code.bytes = 2 + obj.word
        code.binary = () => [
          (0xb0 + (obj.word << 3) + obj.code),
          ...src.data(obj.word)
        ]
      }
      else if (obj.type === "seg") {
        obj.error.error('cannot assign immediate data to segment register')
      }
      else {
        let [mod, rm, data] = obj.rm_mod()
        code.ready = () => (src.ready() && obj.ready())
        code.bytes = 3 + obj.word + obj.size
        code.binary = () => [
          (0xc6 + obj.word),
          ((mod<<6) + rm),
          ...data,
          ...src.data(obj.word)
        ]
      }
    }
  }
  else if ((src.type === 'reg' && src.code === 0) || (obj.type === 'reg' && obj.code === 0)) {

  }
})

// module
module.exports = AssemblerCodeSet
