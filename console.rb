#!/usr/bin/env ruby -w

require "./core.rb"
require "io/console"
require "irb"

print "\x1b[?1049h"
print "\x1b[?1h"

def read_char
  STDIN.echo = false
  STDIN.raw!

  input = STDIN.getc.chr
  if input == "\e" then
    input << STDIN.read_nonblock(3) rescue nil
    input << STDIN.read_nonblock(2) rescue nil
  end
ensure
  STDIN.echo = true
  STDIN.cooked!

  return input
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
  print "\e[2C"
  reg_label.call "CS"
  reg_label.call "ES"
  print "\n\e[1C"
  reg_label.call "CX"
  reg_label.call "DX"
  reg_label.call "SI"
  print "\e[2C"
  reg_label.call "DS"
  print "\n\e[1C"
  reg_label.call "PC"
  reg_label.call "SP"
  reg_label.call "DI"
  print "\e[2C"
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
    r = @cpu.method(label).call
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
  start = start / 0x10
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
  str = ""
  # strlist = ((@cpu.CS * 16 + @cpu.PC - 3)..(@cpu.CS * 16 + @cpu.PC + 40)).map { |e|
  #   c = @cpu.memory[e]
  #   c = c ? c % 0x100 : 0
  #   ("%s%04x %02x %08b" % [((@cpu.CS * 16 + @cpu.PC == e) ? ">" : ( (@cpu.CS * 16 + (@cpu.pos ? @cpu.pos : 0) == e) ? "-" : " ")),e,c,c])
  # }
  strlist = @cpu.codeparse.map { |e|
    if e[1]
      "%s%04x #{e[1].ljust(6)}#{e[2]}" % [(e[0] == @cpu.CS * 16 + @cpu.PC) ? ">" : " ",e[0]]
    else
      "%s%04x %02x %08b" % [(e[0] == @cpu.CS * 16 + @cpu.PC) ? ">" : " ",e[0],@cpu.memory[e[0]],@cpu.memory[e[0]]]
    end
  }
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
    print strlist[i][0..(IO.console.winsize[1]-59)]
  end
end

def step
  @cpu.step
end

def clear
  @cpu.instance_eval do
    @AX, @BX, @CX, @DX = 0, 0, 0, 0
    @SI, @DI, @BP, @SP = 0, 0, 0, 20
    @PC = 0
    @FLAG = 0
    @SS = 6
    @SP = 0x20
    @CS = 0xa
    @memory[0..0x9f] = @memory[0..0x9f].map { |e| 0 }
    @disass = false
  end
end

@cpu.SS = 6
@cpu.SP = 0x20
@cpu.CS = 0xa

@cpu.load_code([
  0b10111011, 0x45, 0x2f,
  0b10001001, 0b01011100,0x02,
  0b10001010, 0b11101011,
  0b11111111, 0b11110011,
  0b11111111, 0b11110011,
  0b11111111, 0b11110011,
  0b10001111, 0b11000010
  ])
@cpu.parse_code

loop do
  show_register
  show_FLAGs
  show_memory
  show_code
  ch = read_char
  print "\e[2J"
  case ch
  when ":"
    print "\e[#{IO.console.winsize[0]};0H\e[K:"
    begin
      cmd = gets
    rescue Exception => e
      print "\e[#{IO.console.winsize[0]};0H\e[K\e[41m#{"input interupt"}\e[0m"
      sleep 1
    end
    begin
      r = eval cmd
      print "\e[#{IO.console.winsize[0]};0H\e[K#{r}"
    rescue Exception => e
      print "\e[#{IO.console.winsize[0]};0H\e[K\e[41m#{e}\e[0m"
    end
  when "i"
    IRB.start
  when "s"
    begin
      print "\e[#{IO.console.winsize[0] - 1};0H"
      as = step
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
  when "r"
    clear
  when "\u0003"
    break

  end
end

print "\e[?1049l"
