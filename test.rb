require "./core"

# code = File.open("codegolf.8086")
@a = CPU.new
@a.CS = 2
@a.load_code([0x12,0x34,0x56])
@a.BP = 4
@a.DI = 8

@a.test 0,3,0

require 'irb'
IRB.start
