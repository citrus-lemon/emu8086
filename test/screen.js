const fs = require('fs')
const {sleep,msleep} = require('sleep')
const {CPU , debug} = require('../index.js')

const code = fs.readFileSync('./test/codegolf.8086')

const screen = "\x1b[?1049h" + "\x1b[?1h" + "\x1b[?25l"
const clear = () => {console.log("\x1b[2J" + "\x1b[0;0H")}
console.log(screen)

const padz = (number, length) => {
  let my_string = number.toString(16);
  while (my_string.length < length) {
      my_string = '0' + my_string;
  }
  return my_string;
}

let d = new debug()
d.load(code)

d.onevent("init",(self) => {
  self.register_assign("SP",0x100)
})

d.onevent("step",(self,code) => {
  // console.log(`${self.cl}: ${code.addr.toString(16)} ${code.command} ${code.args && (code.args.map((e) => e.toString(16)).join(','))}`)
  clear()
  let str = `${self.steptimes}
  ${self.rowstack.map((e) => padz(e,4)).join(' - ')}
  ${self.stack.map((e) => JSON.stringify(e.value)).join(' - ')}
${
    [...Array(25).keys()].map((row) => ([...Array(80).keys()].map((c) => {
        let ch = self.memory(row*80+c+0x8000)
        ch = (ch == 0) ? 0x20 : ch
        return String.fromCharCode(ch)
      }).join(''))
    ).join("\n")
  }
  `;

  console.log(str);
  msleep(40);
})

d.onevent("halt",(self) => {
  console.log('end'+"\x1b[?25h")
})

global.cpu = d

d.run()

