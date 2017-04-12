// define available classes in assembler
const AssemblerCodeSet = require('./codeset.js')

class Segment {
  constructor(name) {
    this.codes = []
    this.push = this.codes.push
    this.label = []
    this.name = name
  }

  labelList() {

  }
}

class DataElement {

}

class ProcElement {

}

class SingletonCode {

}

// functions

function parseCode(codestr) {

}

function chooseSegment(seg) {

}

function splitArgs(str) {

}

module.exports = {
  Segment, DataElement, ProcElement, SingletonCode,
  parseCode, chooseSegment, splitArgs
}
