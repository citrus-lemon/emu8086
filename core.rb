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
      CPU::DataEle.self = self
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
    @PC += 1
    b
  end

  def fetchw
    fetchb + (fetchb << 8)
  end

  DataEle = Class.new(Hash) do

    @@self = self

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
            e[:addr] = @DS * 16 + fetchw
          end
        end
      end
    end

    def data=(d)

    end
    def data
      @DS
    end
  end

  def test
    puts @DS
    DataEle.new.data
  end

end
