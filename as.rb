#!/usr/bin/env ruby -w

# regex of match code
/^\s*(\w*):?\s+(segment|ends|db|dw)\s+(.*?)$/i # segment or data
# $1 = label, $2 = pseudo instruction, $3 = options
/^(\'((?:\\.)|[^\.])*?\'|[^;#])*/ # except Annotations `#` and `;`
# $& = code without Annotations
/^\s*(\w*):/ # substitution for label
# gsub(_,''), $1 = label
/^\s*(\w+)(\s+.*?)?$/ # code
# $1 = code, $2 = options

require "./AssembleInstruction"

class Assemble
  class << self

  end

  include AsmIns


  # Exception handling

  def warning(info)

  end

  def error(info)

  end

  def fatal(info)

  end

end
