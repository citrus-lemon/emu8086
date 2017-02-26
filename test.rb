require "./core"

code = File.open("codegolf.8086")
@cpu = CPU.new

@cpu.load_code([
  0b10111
  ])
