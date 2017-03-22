#!/usr/bin/env ruby

# regex of match code
/^\s*(\w*):?\s+(segment|ends|db|dw)\s+(.*?)$/i # segment or data
# $1 = label, $2 = pseudo instruction, $3 = options
/^((?:\'(?:(?:\\.)|[^\.])*?\'|[^;#])*)[;#](.*)$/ # except Annotations `#` and `;`
# $1 = code without Annotations, $2 = Annotations
/^\s*(\w*):/ # substitution for label
# gsub(_,''), $1 = label
/^\s*(\w+)(\s+.*?)?$/ # code
# $1 = code, $2 = options

require "./ascore"

class Assemble
  def initialize(file)
    if file.class <= IO
      @file = file.read
      if file.class == File
        @filename = file.path
      else
        @filename = "_"
      end
    elsif file.class == String
      @file = file
      @filename = "_"
    else
      "wrong format"
    end
    @file = @file.split("\n")
    @error = STDERR
    @totalline = @file.length
    @exception = []
  end

  # content

  def content
    puts @file
    @file.join("\n")
  end

  class << self

  end

  include AsmIns

  # Assemble operation

  def parse
    @line = 0
    while @line < @totalline
      @line += 1
    end
  end

  # Exception handling

  def warning(info)
    str = "Warning (#{@filename}):#{@line + 1}:#{info}"
    @exception << str
    @error.puts str
    str
  end

  def error(info)
    str = "Error (#{@filename}):#{@line + 1}:#{info}"
    @exception << str
    @error.puts str
    str
  end

  def fatal(info)
    str = "Fatal Error (#{@filename}):#{@line + 1}:#{info}"
    @exception << str
    @error.puts str
    str
  end

end

if __FILE__ == $0
  as = Assemble.new(ARGV[0] ? File.open(ARGV[0]) : STDIN)
  require "pry"
  pry
end
