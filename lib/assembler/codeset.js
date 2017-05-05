// assembler pesudo and code instruction set
let AssemblerCodeSet = []
const { splitArgs, Element } = require('./classes.js')
const pesudo = (sign,method) => AssemblerCodeSet.push({sign,method,type:"pesudo"})
const code   = (sign,method) => AssemblerCodeSet.push({sign,method,type:"code"})

const noargs = (sign,mach) => code(sign, (code,asm,error) => {
  if (code.parameter.trim()) {
    error.error(sign + " need no arguments")
  }
  code.ready = () => void(0)
  code.bytes = 1
  code.binary = () => mach
})

// pesudo code

// instruction

code("MOV", (code,asm,error) => {
  let [obj,src] = splitArgs(code.parameter, error).argsmap(Element.Data)
  if (obj.type === "imm") {
    // object cannot be immediate data
    error.error('object cannot be immediate data')
    return
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
        code.bytes = 2
      }
      else {
        code.ready = () => (src.ready() && obj.ready())
        code.bytes = 3 + obj.word + obj.size
        code.binary = () => {
          let [mod, rm, data] = obj.rm_mod()
          return [
            (0xc6 + obj.word),
            ((mod<<6) + rm),
            ...data,
            ...src.data(obj.word)
          ]
        }
      }
    }
    return
  }
  if ((src.word !== void(0) && obj.word !== void(0)) && (src.word !== obj.word)) {
    // word coherence
    error.error('word coherence error')
    code.bytes = 2
    return
  }
  if (obj.type === "seg") {
    code.ready = () => void(0)
    code.bytes = 2 + src.size
    code.binary = () => {
      let [mod, rm, data] = src.rm_mod()
      return [
        0x8e,
        ((mod << 6) + (obj.code << 3) + rm),
        ...data
      ]
    }
  }
  else if (src.type === "seg") {
    code.ready = () => void(0)
    code.bytes = 2 + obj.size
    code.binary = () => {
      let [mod, rm, data] = obj.rm_mod()
      return [
        0x8c,
        ((mod << 6) + (src.code << 3) + rm),
        ...data
      ]
    }
  }
  else if (src.type === 'reg') {
    code.ready = () => void(0)
    code.bytes = 2 + obj.size
    code.binary = () => {
      let [mod, rm, data] = obj.rm_mod()
      return [
        (0x88 + src.word),
        ((mod << 6) + (src.code << 3) + rm),
        ...data
      ]
    }
  }
  else {
    code.ready = () => void(0)
    code.bytes = 2 + src.size
    code.binary = () => {
      let [mod, rm, data] = src.rm_mod()
      return [
        (0x8a + obj.word),
        ((mod << 6) + (obj.code << 3) + rm),
        ...data
      ]
    }
  }
  return
})

code("PUSH", (code,asm,error) => {
  let args = splitArgs(code.parameter, error).argsmap(Element.Data)
  if (args.length !== 1) {
    error.error('push can only receive one argument')
    return
  }
  let [obj] = args
  if (obj.word !== void(0) && obj.word !== 1) {
    obj.error.error('push must be a word argument')
    return
  }
  if (obj.type === 'reg') {
    code.ready = () => void(0)
    code.bytes = 1
    code.binary = () => [
      0x50 + obj.code
    ]
  }
  else if (obj.type === 'seg') {
    code.ready = () => void(0)
    code.bytes = 1
    code.binary = () => [
      0x06 + (obj.code << 3)
    ]
  }
  else if (obj.type === 'mem') {
    code.ready = () => obj.ready()
    code.bytes = 2 + obj.size
    code.binary = () => {
      let [mod, rm, data] = obj.rm_mod()
      return [
        0xff,
        (mod << 6) + 0x30 + rm,
        ...data
      ]
    }
  }
  else {
    obj.error('cannot push immediate data')
    code.bytes = 1
  }
})


noargs("STI",  0b11111011)
noargs("HLT",  0b11110100)
noargs("WAIT", 0b10011011)
noargs("LOCK", 0b11110000)

// module
module.exports = AssemblerCodeSet
