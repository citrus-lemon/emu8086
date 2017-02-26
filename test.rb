require "./core"

code = File.open("codegolf.8086")
@cpu = CPU.new

@cpu.load_code([
  0b10111
  ])

def show_memory(start=0)
  start = start / 0x10
  # print "\e[6;0H"
  print "┌─[Memory]", "─"*45, "┐\n"
  get_m = lambda do |addr|
    c = @cpu.memory[addr]
    c = c ? c % 0x100 : 0
  end
  print "│"
  print "     "
  16.times do |i|
    print "%2X" % i, " "
  end
  print " │\n"
  12.times do |i|
    print "│"
    print "%04x" % (start * 16 + i * 16), " "
    16.times do |j|
      print "%02x" % get_m.call(start * 16 + i * 16 + j), " "
    end
    print " │\n"
  end
  print "└", "─"*54, "┘\n"
end

# show_memory 0x8000

puts @cpu.step
