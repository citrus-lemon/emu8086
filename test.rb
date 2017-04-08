#!/usr/bin/env ruby -w

require "./core.rb"
require "./debug.rb"
@cpu = CPU.new
@code = File.open(ARGV[0] ? ARGV[0] : "codegolf.8086")

@cpu.oninit do |s|
  s.instance_eval do
    @SP = 0x100
    @first_SP = 0x100
    @CS = 0x000
  end
  s.load_code(@code)
  s.parse_code
end

@cpu.onstep do |s,c|
  # puts "#{s.current_times}\t0x#{c[0].to_s(16)}:\t #{c[1]}\t #{c[2]}"
  print "#{s.current_times}\t#{c[1]}\t"
  print ["AX", "BX", "CX", "DX", "SI", "DI", "BP", "SP"].map { |e| s.method(e).call }.join("\t")
  print "\t#{s.CF.to_i.to_s}"
  puts
end

@cpu.run
