let AssemblerCodeSet = []

function AsCodeSet(code,fn) {
  AssemblerCodeSet.push({
    sign: code,
    method: block
  })
}

AsCodeSet("MOV",(code) => {
  let match = code.parameter.match(/^(?:\s*(word|byte)\s+)*(.*?)$/i)

})

module.exports = AssemblerCodeSet
