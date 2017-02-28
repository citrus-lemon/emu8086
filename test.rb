#!/usr/bin/env ruby -w
require "./core"

code = File.open("codegolf.8086")
@a = CPU.new
@a.CS = 0
@a.load_code(code)
@a.parse_code

puts @a.codeparse.map { |e|
  if e[1]
    "%s%04x #{e[1].ljust(6)}#{e[2]}" % [(e[0] == @a.CS * 16 + @a.PC) ? ">" : " ",e[0]]
  else
    "%s%04x %02x %08b" % [(e[0] == @a.CS * 16 + @a.PC) ? ">" : " ",e[0],@a.memory[e[0]],@a.memory[e[0]]]
  end
}

require 'irb'
# IRB.start
