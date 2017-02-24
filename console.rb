#!/usr/bin/env ruby -w

require "./core.rb"
require "io/console"

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

# loop do
  show_register
  show_FLAGs
  show_memory
  ch = read_char
  # if ch == "\u0003" then break; end
# end

print "\e[?1049l"
