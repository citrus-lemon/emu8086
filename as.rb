#!/usr/bin/env ruby -w

class Integer
  def pos
    self.negative? ? 0 : self
  end
end

def Assemble(code)
  cp = 0 # code point
  label = []
  line = 0

  err = lambda do
    code_list = code.split("\n")
    ((line-5).pos..(line+5).pos).each do |e|
      STDERR.print e == line ? ">>> " : "    "
      STDERR.puts code_list[e]
    end
  end

  code.each_line do |c|
    # v = c.gsub(/[;#].*/,"")
    v = c[/^(\'((?:\\.)|[^\.])*?\'|[^;#])*/]
    if v =~ /^\s*(\w*):/
      label << { :label => $1, :pos => cp }
      v = v.gsub(/^\s*(\w*):/, "")
    end
    if v =~ /^\s*((\w+)|$)/
      unless $1.empty?
        op = $1
        
      end
    elsif v =~ /^\s*%define(.*?)$/
      #define
    else
      err.call
      return
    end
    line += 1
  end
end

if __FILE__ == $0
  puts "Ruby 8086 emulator Assembler"
  c = ""
  c = File.open(ARGV[0]).read unless ARGV.empty?
  Assemble c
end
