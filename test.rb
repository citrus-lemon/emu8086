#!/usr/bin/env ruby -w
require "./core"

code = File.open("codegolf.8086")
@cpu = CPU.new
@cpu.instance_eval do
  @SP = 0x100
  @first_SP = 0x100
end
@cpu.load_code(code)
@cpu.parse_code

puts @cpu.codeparse.map { |e|
  "%s%04x #{e[1].ljust(6)}#{e[2]}" % [(e[0] == @cpu.PC) ? ">" : " ",e[0]]
}

require 'irb'
# IRB.start
