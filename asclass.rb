require './expression'
module AssemblerClasses

  class Element

    @@self = nil

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

    def initialize(str,word = nil, me = nil)
      @str, @word = str.strip, word
      @self = nil
      @info = {}
      if me
        bind(me)
      else
        bind(@@self) if @@self
      end
      parse
    end

    attr_reader :word

    private def bind(obj)
      @self = obj
      [:error, :warning, :fatal].each do |fn|
        define_method fn { |*args| @self.method(fn).call(*args) }
      end
      ["code","segment"].each do |var|
        define_method var.to_sym { @self.instance_variable_get(("@"+var).to_sym) }
      end
    end

    private def parse
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
        when @str =~ /^(?:(word|byte)\s+)*(?:(\w+)\s*)*(?:\[(.*?)\])*$/i
          @info[:type] = "mem"
          @info[:word] = case $1.to_s.upcase
            when "WORD" then 1
            when "BYTE" then 0
          end
          exp = $3.to_s + ($2 ? "+#{$2}" : "")
          exp = Expression::exp(exp) rescue error("wrong expression #{exp}")
          # TODO: add register conflict verify
          mod_reg = if exp.class == Array
            exp.map do |e| 
              e.upcase if e.class == String
            end.select do |i| 
              ["BX","BP","SI","DI"].include?(i)
            end
          else []
          end
          exp = exp.select {|i| ["BX","BP","SI","DI"].include?(i.to_s.upcase).! } if exp.class == Array
          exp = Expression::calc(exp, @self ? code[segment][:label] : nil) if Expression::vaild?(exp,@self ? code[segment][:label] : nil)
          @info[:mod] = @info[:size] = if exp.class == Integer
            unless exp == 0
              a = exp >= 0 ? exp : (-exp)-1
              if a/0x100 < 1 then 1
              elsif a/0x10000 < 1 then 2
              else
                warning "disp too large"
                2
              end
            else 0
            end
          else 2
          end
          @info[:disp] = exp
          @info[:rm] = @@rm_tab.index(mod_reg.sort)
          unless @info[:rm]
            if mod_reg.empty?
              @info[:rm] = 6
              @info[:mod] = 0
              @info[:size] = 2
            else
              error "wrong register group (#{mod_reg.join(', ')})"
            end
          end
        when Expression::format?(@str)
          @info[:type] = "imm"
          exp = Expression::exp(@str) rescue error("wrong expression #{@str} and can't be parse as immediate data")
          exp = Expression::calc(exp, @self ? code[segment][:label] : nil) if Expression::vaild?(exp,@self ? code[segment][:label] : nil)
          @info[:value] = exp
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
      @word = @info[:word]
    end

    # compare

    def ==(e)
      if e.class == self.class
        false
        # TODO: check
      elsif e.class == String
        self.info[:name] == e.upcase
      else
        false
      end
    end

    # xxx? func to check the type
    ["memory","segment","register","immediate"].each do |fn|
      define_method (fn+"?").to_sym do
        @info[:type] == fn[0..2]
      end
    end

    def code; return @info[:code] if ["reg","seg"].include?(@info[:type]) ;end
    def rm_mod
      # return [mod, r/m]
      case @info[:type]
        when "mem"
          return [@info[:mod],@info[:rm],Expression::calc(@info[:disp], @self ? code[segment][:label] : nil)]
        when "reg"
          return [3,@info[:code]]
      end
    end

    def ready
      case @info[:type]
        when "reg", "seg"
          true
        when "imm"
          Expression::vaild?(@info[:value], @self ? code[segment][:label] : nil)
        when "mem"
          Expression::vaild?(@info[:disp], @self ? code[segment][:label] : nil)
        else false
      end
    end

    # description
    def to_s

    end
    
  end

  class SingletonCode
    def initialize(code,opts,label,comment)
      @code = code.upcase
      @parameter = opts
      @label = label
      @comment = comment
      @annotate = {

      }
      @binary = nil
      @ready = Proc.new {"initialize"}
    end

    # For instruction defining

    attr_accessor :bytes
    attr_reader :parameter

    def annotate=(opt)
      @annotate = @annotate.merge(opt)
    end

    # check the status if it is ready to compile
    def ready(&block)
      # return `nil' if ready
      @ready = block
    end

    # load compile to binary func
    def compile(&block)
      @compile = block
    end

    # compile code

    def getready
      unless @ready.call
        @binary = @compile.call
      else
        false
      end
    end
    
    def getready!
      unless m = @ready.call
        @binary = @compile.call
      else
        throw m
      end
    end

    # apply

    def apply(code_set, me)
      code_set.each do |code|
        if (
          (
            (code[:sign].class == String) && 
            (code[:sign] == @code)
          ) || 
          (
            (code[:sign].class == Regexp) && 
            (code[:sign] =~ @code)
          )
        )
          me.instance_exec(self, &code[:method])
          break
        end
      end
    end

    def binary
      @binary.map(&:chr).join if @binary
    end

    # description
    def to_s

    end
    
  end

  def initialize(*args)
    super(*args)
    me = self
    @Element = Class.new(Element) do
      @@self = me
    end
  end

end

class Integer
  def split_by_bytes(i = nil)
    if i
      throw "number too long" if (self.bit_length + 7) / 8 > i
      num = self % (1<<(8*(i)))
    else
      i = (self.bit_length + 7) / 8
      num = self
    end
    (1..i).map do |x|
      (num & ((1<<(8*(x))) - (1<<(8*(x-1))))) >> (8*(x-1))
    end.reverse
  end
end