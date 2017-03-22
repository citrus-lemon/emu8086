#!/usr/bin/env ruby -w

__version__ = "emu8086 assembler 0.0.0(alpha)"

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

  class SingletonCode
    def initialize
      
    end
  end

  # procedure of assembling
  def assemble
    # initialize
    @code = {
      "main" => {
        :codes => [],
        :name  => "main",
        :type  => :code
      }
    }
    @segment = "main"

    # 1st: parse the code

    # 2nd: expression and marco

  end
  
  # Code Exporting

  def binary
    
  end

  def code

  end

private
  
  # exception deal
  ["error","warning","fatal"].each do |p|
    define_method p.to_sym do |str|
      @error << "#{p}[#{@line + 1}]: #{str}\n"
      case
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
    print as.binary
  else
    STDERR.puts "no input file, halt"
    exit
  end
  
end
