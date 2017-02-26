class CPU
  def initialize(copy=nil)
    unless copy
      @AX, @BX, @CX, @DX = 0, 0, 0, 0
      @SI, @DI, @BP, @SP = 0, 0, 0, 0
      @PC = 0
      @CS, @DS, @ES, @SS = 0x800, 0, 0, 0
      @FLAG = 0
      @memory = []
      @disass = false
    end

    me = self

    @DataEle = Class.new(Hash) do

      @@self = me

      @@reg_tab = [
        ["AL","CL","DL","BL","AH","CH","DH","BH"],
        ["AX","CX","DX","BX","SP","BP","SI","DI"]
      ]

      class << self
        attr_accessor :self
        def reg_tab() @@reg_tab; end
        def reg(d,w)
          e = self.new
          e[:class] = "reg"
          e[:sign] = e[:name] = @@reg_tab[w][d]
          e[:word] = w
        end
        def r_mem(mod,rm,w)
          case mod
          when 3
            return reg(rm,w)
          else
            e = self.new
            e[:class] = "mem"
            e[:word] = w
            if (mod == 0) && (rm == 6)
              disp = @@self.fetchw
              e[:addr] = @@self.DS * 16 + disp
              e[:sign] = "[0%04xH]" % disp
            end
          end
        end
      end

      def data=(d)

      end
      def data

      end
    end

  end
  attr_accessor :memory, :FLAG, :AX, :BX, :CX, :DX, :SI, :DI, :BP, :SP, :PC, :CS, :DS, :ES, :SS
  attr_reader :disass, :pos, :codeparse

  # Flags
  [
    ["CF", 0],
    ["PF", 2],
    ["AF", 4],
    ["ZF", 6],
    ["SF", 7],
    ["TF", 8],
    ["IF", 9],
    ["DF", 10],
    ["OF", 11],
  ].each do |flag|
    define_method flag[0].to_sym do
      (@FLAG & 1 << flag[1]).zero?.!
    end
    define_method (flag[0]+"=").to_sym do |a|
      @FLAG = (@FLAG & ~(1 << flag[1])) + (a.nonzero?.to_i << flag[1])
    end
  end

  ["A","B","C","D"].each do |reg| # AL,BL,CL,DL,AH,BH,CH,DH
    define_method (reg + "L").to_sym do
      self.instance_variable_get("@"+reg+"X") & 0xff
    end
    define_method (reg + "H").to_sym do
      (self.instance_variable_get("@"+reg+"X") & 0xff00) >> 8
    end
    define_method (reg + "L=").to_sym do |val|
      self.instance_variable_set("@"+reg+"X", (self.instance_variable_get("@"+reg+"X") & 0xff00) + (val % 0x100) )
    end
    define_method (reg + "H=").to_sym do |val|
      self.instance_variable_set("@"+reg+"X", (self.instance_variable_get("@"+reg+"X") & 0x00ff) + ((val % 0x100) << 8) )
    end
  end

  def load_code(code)
    if code.class == Array
      @codeline = code.length
      @memory[(@CS*16)..(@CS*16+@codeline)] = code.map { |e| e % 0xff }
    end
  end

  def fetchb
    b = @memory[@CS * 16 + @PC]
    b = b ? b % 0xff : 0
    @PC += 1
    b
  end

  def fetchw
    fetchb + (fetchb << 8)
  end



  def test
    @DataEle.r_mem(0,6,1)
  end

end
