#!/usr/bin/env ruby -w

require "./core.rb"
require "./debug.rb"
require "io/console"
require "irb"

print "\x1b[?1049h"
print "\x1b[?1h"
print "\x1b[?25l"

def read_char
  STDIN.getch
end

@cpu = CPU.new
# @cpu.FLAG = 0xe3

def show_register
  print "\e[0;0H"
  print "┌─[Register]──────────────────────────────┐\n"
  print "│                                         │\n"
  print "│                                         │\n"
  print "│                                         │\n"
  print "└─────────────────────────────────────────┘\n"
  print "\e[0;0H\e[0B\e[0C"
  reg_label = lambda do |label|
    print "#{label} #{"%04x" % @cpu.method(label).call}\e[0C"
  end
  reg_label.call "AX"
  reg_label.call "BX"
  reg_label.call "BP"
  print "  "
  reg_label.call "CS"
  reg_label.call "ES"
  print "\n "
  reg_label.call "CX"
  reg_label.call "DX"
  reg_label.call "SI"
  print "  "
  reg_label.call "DS"
  print "\n "
  reg_label.call "PC"
  reg_label.call "SP"
  reg_label.call "DI"
  print "  "
  reg_label.call "SS"
end

def show_FLAGs
  print "\e[0;0H"
  print "\e[44C┌─[Flags]──┐\n"
  print "\e[44C│          │\n"
  print "\e[44C│          │\n"
  print "\e[44C│          │\n"
  print "\e[44C└──────────┘\n"
  f_label = lambda do |label|
    r = @cpu.method(label).call == 1
    print "\e[4m" if r # underscore
    print "\e[7m" if r # reverse
    print label
    # print r ? "*" : " "
    print "\e[0m" if r
    print "\e[1C"
  end
  print "\e[0;0H"
  print "\n\e[46C"
  f_label.call "CF"
  f_label.call "ZF"
  f_label.call "IF"
  print "\n\e[46C"
  f_label.call "PF"
  f_label.call "SF"
  f_label.call "DF"
  print "\n\e[46C"
  f_label.call "AF"
  f_label.call "TF"
  f_label.call "OF"
end

def show_memory(start=0)
  start = start / 0x10 * 0x10
  print "\e[6;0H"
  print "┌─[Memory]", "─"*45, "┐\n"
  get_m = lambda do |addr|
    c = @cpu.memory[addr]
    c = c ? c % 0x100 : 0
  end
  print "│"
  print "\e[5C"
  16.times do |i|
    print "%02x" % i, "\e[0C"
  end
  print " │\n"
  12.times do |i|
    print "│"
    print "%04x" % (start + i * 16), "\e[0C"
    16.times do |j|
      print "%02x" % get_m.call(start + i * 16 + j), "\e[0C"
    end
    print " │\n"
  end
  print "└", "─"*54, "┘\n"
end

def show_code
  r = -1
  d = 0
  strlist = @cpu.codeparse.map { |e|
    r += 1
    if e[1]
      d = r if (e[0] == @cpu.PC)
      "%s%04x #{e[1].ljust(6)}#{e[2]}" % [(e[0] == @cpu.PC) ? ">" : " ",e[0]]
    else
      "%s%04x %02x %08b" % [(e[0] == @cpu.PC) ? ">" : " ",e[0],@cpu.memory[e[0]],@cpu.memory[e[0]]]
    end
  }
  strlist = strlist[(d-6 >= 0 ? d-6 : 0)..-1]
  print "\e[0;57H"
  print "┌─[Code]", "─" * (IO.console.winsize[1]-9-56), "┐\n"
  18.times do |i|
    print "\e[56C", "│\e[#{IO.console.winsize[1]-57}C│\n"
  end
  print "\e[56C", "└", "─"*(IO.console.winsize[1]-58), "┘\n"
  # strlist = str.split('\n')
  18.times do |i|
    print "\e[#{i+2};58H"
    break unless strlist[i]
    print strlist[i][0..(IO.console.winsize[1]-59)].ljust(IO.console.winsize[1]-58)
  end
end

def show_stack
  print "\e[21;2H\e[K"
  print "#{@cpu.stack.map{ |e| "%04x" % e}.join('-')}"
end

def show_screen
  scr = (0x000..(0x000 + 80*25 - 1)).map { |e| @cpu.memory[0x8000 + e] ? @cpu.memory[0x8000 + e] : 0 }
  print "\e[23;2H"
  n = 23
  (0..24).each do |i|
    print "\e[#{n+i};2H", scr[i*80..(i*80+79)].map { |e| e >= 0x20 ? e.chr : "\e[0C" }.join('')
  end
end

@code = File.open("codegolf.8086")

@cpu.oninit do |s|
  s.instance_eval do
    @SP = 0x100
    @first_SP = 0x100
    @CS = 0x000
  end
  s.load_code(@code)
  s.parse_code
end



# @code = [
#   0b10111011, 0x45, 0x2f,         # MOV   BX, 2f45H
#   0b10111001, 0xe3, 0x13,         # MOV   CX, 13e3H
#   # 0b10001001, 0b01011100,0x02,    # MOV   [SI+02H], BX
#   # 0b10001010, 0b11101011,         # MOV   CH, BL
#   0b01010011,                     # PUSH  BX
#   0b01010001,
#   0b01011011,                     # POP   BX
#   0b01011001,                     # POP   CX
#   # 0b10111000, 0xe1, 0x5a,         # MOV   AX, 5ae1H
#   # 0b10010011,                     # XCHG  AX, BX
#   # 0b10110011, 0x5e,               # MOV   BL, 5EH
#   # 0b10110000, 0x3c,               # MOV   AL, 3CH
#   # 0b00000000, 0b11000011,         # ADD   AL, BL
#   # 0b10000000, 0b11000000, 0x73,   # ADD AL, 73H
#   # 0b00000100, 0x73,               # ADD AL, 73H
#   # 0b11000110, 0b00000110, 0x5e, 0x00, 0x13 # MOV [005eH], 13H
#   # 0b10110011, 0x09,               # MOV   BL, 5EH
#   # 0b10110000, 0x05,               # MOV   AL, 3CH
#   # 0b00000000, 0b11000011,         # ADD   AL, BL
#   # 0b00110111,                     # AAA
#   # 0b00101000, 0b11000011,
#   ]

@s = 0.04
@bp = []
@bpl = -1
@ms = 0x8000

def rbs(i=1) #run by step
  step
  yield
end

def cl
  @cpu.current_times
end


loop do
  show_register
  show_FLAGs
  show_memory @ms
  show_screen
  show_code
  show_stack
  ch = read_char
  case ch
  when ":"
    print "\e[#{IO.console.winsize[0]};0H\e[K:"
    begin
      cmd = gets
      print "\e[2J"
    rescue Exception => e
      print "\e[#{IO.console.winsize[0]};0H\e[K\e[41m#{"input interupt"}\e[0m"
    end
    begin
      r = eval cmd
      print "\e[#{IO.console.winsize[0]};0H\e[K#{r}"
    rescue Exception => e
      print "\e[#{IO.console.winsize[0]};0H\e[K\e[41m#{e}\e[0m"
    end
  when "i"
    print "\e[2J"
    IRB.start
    print "\e[2J"
  when "s"
    begin
      print "\e[#{IO.console.winsize[0] - 1};0H"
      as = @cpu.step
      print "%04x  " % as[0]
      print as[1].ljust(10)
      print as[2]
    rescue Exception => e
      if e.message =~ /unknown operator/
        print "unknown operator"
      else
        print "\e[#{IO.console.winsize[0]-4};0H\e[K\e[41m"
        puts e.message
        puts e.backtrace[0..3]
      end
      print "\e[0m"
    end
  when "d"
    # print "\e[2J"
    @cpu.step_over
  when "f"
    # print "\e[2J"
    @cpu.step_out
  when "p"
    print "\e[2J"
    print "\e[0;0H"
    puts "auto running until breakpoint"
    puts "press ^C to stop"
    @cpu.onstep do
      if @s > 0
        print "\e[2J"
        show_register
        show_FLAGs
        show_memory @ms
        show_code
        show_stack
        show_screen
        sleep @s
      end
    end
    @cpu.debug
    @cpu.onstep {}
  when "r"
    print "\e[2J"
    @cpu.clear
  when "\u0003"
    break
  when "q"
    ch = read_char
    if ch == "q"
      break
    end
  else
    print "\e[2J"
  end
end

print "\x1b[?1l"
print "\x1b[?25h"
print "\e[?1049l"
