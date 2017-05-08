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

code("MOV",  (code,asm,error) => {
  let [obj,src] = splitArgs(code.parameter, error, 2).argsmap(Element.Data)
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
  if (
    (src.word !== void(0) && obj.word !== void(0)) && (src.word !== obj.word)
  ) {
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
  let args = splitArgs(code.parameter, error, 1).argsmap(Element.Data)
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
code("POP",  (code,asm,error) => {
  let args = splitArgs(code.parameter, error, 1).argsmap(Element.Data)
  if (args.length !== 1) {
    error.error('pop can only receive one argument')
    return
  }
  let [obj] = args
  if (obj.word !== void(0) && obj.word !== 1) {
    obj.error.error('pop must be a word argument')
    return
  }
  if (obj.type === 'reg') {
    code.ready = () => void(0)
    code.bytes = 1
    code.binary = () => [
      0x58 + obj.code
    ]
  }
  else if (obj.type === 'seg') {
    code.ready = () => void(0)
    code.bytes = 1
    code.binary = () => [
      0x07 + (obj.code << 3)
    ]
  }
  else if (obj.type === 'mem') {
    code.ready = () => obj.ready()
    code.bytes = 2 + obj.size
    code.binary = () => {
      let [mod, rm, data] = obj.rm_mod()
      return [
        0x8f,
        (mod << 6) + 0x00 + rm,
        ...data
      ]
    }
  }
  else {
    obj.error('cannot pop immediate data')
    code.bytes = 1
  }
})
code("XCHG", (code,asm,error) => {
  let [s1,s2] = splitArgs(code.parameter, error, 2).argsmap(Element.Data)
  if (
    (s1.word !== void(0) && s2.word !== void(0)) && (s1.word !== s2.word)
  ) {
    // word coherence
    error.error('word coherence error')
    code.bytes = 2
    return
  }
  if (s1.name === "AX" && s2.type === 'reg' || s2.name === "AX" && s1.type === 'reg') {
    if (s1.name !== "AX")
      [s1,s2] = [s2,s1];
    code.bytes = 1
    code.ready = () => void(0)
    code.binary = () => [
      0x90 + s2.code
    ]
    if (s2.code === 0) {
      s2.error.warning('exchange ax to ax be parse to NOP')
      code.code = "NOP"
    }
  }
  else {
    if (s1.type === 'reg' || s2.type === 'reg') {
      if (s1.type !== 'reg')
        [s1,s2] = [s2,s1];
      let w = s1.word
      code.bytes = 2 + s2.size
      code.ready = () => s2.ready()
      code.binary = () => {
        let [mod, rm, data] = s2.rm_mod()
        return [
          0x86 + w,
          (mod << 6) + (s1.code << 3) + rm,
          ...data
        ]
      }
    } else {
      code.bytes = 2
      error.error('cannot exchange from memory to memory')
    }
  }
})
code("IN",   (code,asm,error) => void(0))
code("OUT",  (code,asm,error) => void(0))
noargs("XLAT", 0b11010111)
code("LEA",  (code,asm,error) => void(0))
code("LDS",  (code,asm,error) => void(0))
code("LES",  (code,asm,error) => void(0))
noargs("LAHF", 0b10011111)
noargs("SAHF", 0b10011110)
noargs("PUSHF",0b10011100)
noargs("POPF", 0b10011101)

noargs("CLC",  0b11111000)
noargs("CMC",  0b11110101)
noargs("STC",  0b11111001)
noargs("CLD",  0b11111100)
noargs("STD",  0b11111101)
noargs("CLI",  0b11111010)
noargs("STI",  0b11111011)
noargs("HLT",  0b11110100)
noargs("WAIT", 0b10011011)
code("ESC",  (code,asm,error) => void(0))
noargs("LOCK", 0b11110000)

// module
module.exports = AssemblerCodeSet
