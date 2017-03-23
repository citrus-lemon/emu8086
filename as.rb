#!/usr/bin/env ruby -w

__version__ = "emu8086 assembler 0.0.0(alpha)"


require './asclass'
class Assembler

  # initialize the Assembler instance
  def initialize(file,error = nil)

    @filename = "-"
    if file.class == String
      @content = file
    elsif file.class <= IO
      @content = file.read
      @filename = file.path if file.class == File
    end

    # File content by line
    @content = @content.split("\n")

    # Rows of file
    @rows = @content.length
    @line = 0

    # Exception
    @error = error || []
    @errorflag = false # flag true when disable to generate the code

  end

  prepend AssemblerClasses

  # procedure of assembling
  def assemble
    # initialize
    @code = {
      "main" => {
        :codes => [],
        :name  => "main",
        :type  => :code,
        :label => {}
      }
    }
    @segment = "main"
    @offset = 0
    label = nil

    # 1st: parse the code
    @rows.times do |i|
      @line = i

      # except comment `#` and `;`
      @content[@line] =~ /^((?:\'(?:(?:\\.)|[^\.])*?\'|[^;#])*)(?:[;#](.*))*$/
      # $1 = code without comment, $2 = comment
      code_string = $1
      comment = $2

      case code_string
      when /^(?:\s*(\w*):?\s+)*(segment|ends|db|dw)\s+(.*?)$/i # segment or data
        # $1 = label, $2 = pseudo instruction, $3 = options
        
        case $2.downcase
        when 'segment'
        when 'ends'
        else
          l = $1.strip.empty? ? nil : $1
          warning "label #{label} at offset #{@offset} has been redefine, the previous has been ignored" if label && l
          label = l if l
          code = $2
          para = $3
        end
      when /^(?:\s*(\w+):)*\s*(?:(\w+)(\s+.*?)?)?$/ # parse label and code
        # $1 = label, $2 = code, $3 = options
        warning "label #{label} at offset #{@offset} has been redefine, the previous has been ignored" if label && $1
        label = $1 if $1
        code = $2
        para = $3
      when /^\s*(%\w+)(\s+.*?)?/ # marco
        code = $1
        para = $2
      else
        fatal "parse error"
      end

      if label
        # label case sensitive
        unless @code[@segment][:label][label]
          @code[@segment][:label][label] = @offset
        else
          error "label #{label} redefine" unless @code[@segment][:label][label] == @offset
        end
      end
      
      if code
        code = SingletonCode.new(code, para, label, comment)
        code.apply(@@code_set, self)
        # offset += code.bytes
        # code.getready
        label = nil
      end

    end

    # 2nd: expression and marco

    # @code.each_pair do |key,value|
    #   value[:code].each do |code|
    #     # code.getready!
    #   end
    # end
    
  end
  
  # Code Exporting

  def binary

  end

  def code

  end
  
  # exception deal
  ["error", "warning", "fatal"].each do |p|
    define_method p.to_sym do |str|
      @error << "#{p}[#{@line + 1}]: #{str}\n"
      case p
      when "fatal" then throw "fatal error and halt"
      when "error" then @errorflag = true
      end
    end
  end

end

# main console program
if __FILE__ == $0
  STDERR.puts "Ruby 80x86 assembler"
  require 'optparse'
  options = {}
  cmd = OptionParser.new do |opts|
    opts.banner = "Usage: #{$0} [options]"

    opts.on("-v", "--version", "Show the version") do |v|
      STDERR.puts __version__
      exit
    end

    opts.on_tail("-h", "--help", "Show help") do
      STDERR.puts opts
      exit
    end

  end

  begin
    cmd.parse!
  rescue => exception
    STDERR.puts exception
    STDERR.puts cmd
    exit
  end
  
  if ARGV[0]
    as = Assembler.new(ARGV[0] == "-" ? STDIN : File.open(ARGV[0]), STDERR)
    as.assemble
    require 'pry'
    pry
    # print as.binary
  else
    STDERR.puts "no input file, halt"
    exit
  end
  
end
