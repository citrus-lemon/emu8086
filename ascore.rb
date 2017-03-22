module AsmIns # AssembleInstruction
  @@instruction_set = {}

  class Segment < Array
    def initialize(name,type = :code)
      @name = name
      @type = type
      @offset = 0
    end

    attr_reader :name

    def <<(code)
      super
      @offset += code.bytes
    end

  end

  # Parse a element from String
  class Element

    @@reg_tab = [
      "AL","CL","DL","BL","AH","CH","DH","BH", # 8  bits
      "AX","CX","DX","BX","SP","BP","SI","DI"  # 16 bits
    ]

    @@reg_seg = ["ES","CS","SS","DS"]
    @@rm_tab = [
      ["BX","SI"],
      ["BX","DI"],
      ["BP","SI"],
      ["BP","DI"],
      ["SI"],
      ["DI"],
      ["BP"],
      ["BX"],
    ]

    def initialize(str,w = nil)
      @str = str.strip
      @word = w
      @info = {}
      parse
    end

    attr_reader :info

    def parse
      case
      when _ = @@reg_tab.index(@str.upcase)
        @info[:type] = "reg"
        @info[:word] = _ / 8
        @info[:name] = @str.upcase
        @info[:code] = _ % 8
      when _ = @@reg_seg.index(@str.upcase)
        @info[:type] = "seg"
        @info[:word] = 1
        @info[:name] = @str.upcase
        @info[:code] = _
      when @str =~ /^\d[\da-f]*(h)|[0-1]+(b)|\d+$/i
        @info[:type] = "imm"
        @info[:value] = numparse @str
      when @str =~ /^(?:(word|byte)\s+)*(?:(\w+)\s*)*\[(.*?)\]$/i
        @info[:type] = "mem"
        @info[:word] = case $1.to_s.upcase
        when "WORD" then 1
        when "BYTE" then 0
        end
        # puts $2
        e = $3.split('+').map(&:strip)
        k = e.map(&:upcase).select {|i| ["BX","BP","SI","DI"].inc lude?(i) }
        t = e.map(&:upcase).select {|i| !["BX","BP","SI","DI"].include?(i) }
        error "number wrong format #{t.join('+')}" if t.length > 1
        @info[:rm] = @@rm_tab.index(k.sort)
        error "no memory mod `#{@str}'" unless @info[:rm]
      # when @str =~ /^\w+$/
        # @info[:type] = "var"
        # @info[:name] = $&
      else
        error "invaild expression `#{@str}'"
      end
      if @word
        if @word != @info[:word]
          if @info[:word]
            warning "word long conflict, the sign #{case @word
            when 0 then "BYTE"
            when 1 then "WORD"
            end} has been ignored"
          else
            @info[:word] = @word
          end
        end
      end
      @info
    end

    def is_segment
      @info[:type] == "seg"
    end

    def is_register
      @info[:type] == "reg"
    end

    def is_immediate
      @info[:type] == "imm"
    end

    def is_clean_memory

    end
    
    def is_memory

    end

    def word
      @info[:word]
    end

    def r_mem
      [mod, rm, disp]
    end

    def reg
      reg
    end
    
    def seg
      seg
    end
    
    def addr

    end
    
    def imm

    end

    def ==(e)
      if e.class == self.class
        e.parse == self.info
      elsif e.class == String
        self.info[:name] == e.upcase
      end
    end

    def to_s
      @info.to_s
    end

  end

  class SingletonCode
    def initialize(*argument)
      @offset = *argument
      @pseudo = false
      @bytes = nil
      @code
    end

    def bytes=(b)
      unless @bytes
        @bytes = b
      else
        warning("bytes redefine")
      end
    end
    

    def ready(&block)

    end

    def compile(&block)

    end
    

  end

  def self.pseudo(code,&block)
    @@instruction_set[code] = {
      :name => code,
      :type => :pseudo_code,
      :proc => block
    }
  end

  def self.incode(code,&block)
    @@instruction_set[code] = {
      :name => code,
      :type => :instruction_code,
      :proc => block
    }
  end
end

def numparse(str)
  if str =~ /^\d[\da-f]*(h)|[0-1]+(b)|\d+$/i
    nt = $1 ? $1 : $2
    nt = nt ? nt.upcase : ""
    case nt
    when "H"
      $&.hex
    when "B"
      $&.to_i(2)
    else
      $&.to_i
    end
  end
end

AsmIns::incode "MOV" do |code|
  code.parameter =~ /^(?:\s*(word|byte)\s+)*(.*?)$/i
  w = case $1.to_s.upcase
    when "WORD" then 1
    when "BYTE" then 0
    else nil
  end
  obj, src = $2.split(',',2).map {|el| AsmIns::Element.new(el,w)}
  # length
  w = unless obj.word && src.word
    obj.word || src.word
  else
    if obj.word == src.word
      obj.word
    else
      error("length don't match")
    end
  end



  code.bytes = 0
  code.annotate = ["MOV",]
  code.ready do
    obj.ready && src.ready
  end
  code.compile do

  end
end

AsmIns::incode "NOP" do |code|
  code.annotate = ["NOP"]
  code.ready {true}
  code.compile {[0x90]}
end
