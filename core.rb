require "./InstructionSet"
class CPU
  def initialize(copy=nil)
    unless copy
      @AX, @BX, @CX, @DX = 0, 0, 0, 0
      @SI, @DI, @BP, @SP = 0, 0, 0, 0x400
      @first_SP = 0x400
      @PC = 0
      @CS, @DS, @ES, @SS = 0x800, 0, 0, 0x400
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

      @@reg_seg = ["ES","CS","SS","DS"]
      @@d_tag = ["from","to"]
      @@w_tag = ["byte","word"]
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

      class << self
        attr_accessor :self
        def reg_tab() @@reg_tab; end

        def reg(d,w=2)
          e = self.new
          e[:class] = "reg"
          if d.class == String
            (e[:sign] = e[:name] = d; e[:word] = 0; return e) if ["AL","CL","DL","BL","AH","CH","DH","BH"].include?(d)
            (e[:sign] = e[:name] = d; e[:word] = 1; return e) if ["AX","CX","DX","BX","SP","BP","SI","DI","ES","CS","SS","DS","PC"].include?(d)
            throw "invaild register name"
          else
            e[:sign] = e[:name] = @@reg_tab[w][d]
            e[:word] = w
            throw "need Word Instruction param" if w == 2
          end
          e
        end
        def seg(seg)
          self.reg(@@reg_seg[seg])
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
              e[:base] = @@self.DS * 16
              e[:addr] = @@self.DS * 16 + disp
              e[:sign] = "[0%04xH]" % disp
            else
              # TODO: explain for base address
              e[:addr] = if @@rm_tab[rm].include? "BP"
                @@self.SS * 16
              else
                @@self.DS * 16
              end
              e[:base] = e[:addr]
              e[:sign] = @@rm_tab[rm].map { |el|
                r = self.reg(el)
                e[:addr] += r.data
                r.sign
              }.join('+')
              disp = case mod
              when 0 then 0
              when 1 then @@self.fetchb
              when 2 then @@self.fetchw
              end
              e[:addr] += disp
              e[:sign] += (mod == 0) ? "" : ("+%0#{mod*2}xH" % disp)
              e[:sign] = "[#{e[:sign]}]"
            end
          end
          e
        end
        def mem(addr,static = "DS",w = 1)
          e = self.new
          e[:class] = "mem"
          e[:base] = case static
          when "DS" then @@self.DS
          when "SS" then @@self.SS
          else 0
          end * 16
          e[:addr] = e[:base] + addr
          e[:word] = w
          e[:sign] = "[%0#{(w+1)*2}xH]" % addr
          e
        end
        def imm(v,w=0)
          e = self.new
          e[:class] = "imm"
          w = 1 if v >= 0x100
          e[:value] = v % 0x10000
          e[:sign] = "%0#{(w+1)*2}xH" % e[:value]
          STDERR.puts "Immediate data overflow" if v >= 0x10000
          e[:word] = w
          e
        end
      end

      def sign; self[:sign]; end
      def w   ; self[:word]; end

      def data=(d)
        data = unless d.class == self.class
          d % 0x10000
        else
          throw "length difference between object and source" if (d[:class] == "mem" && d.w != self.w) || (d.w > self.w)
          d.data
        end
        case self[:class]
        when "reg"
          @@self.method(self[:name]+"=").call(data)
        when "mem"
          if self.w == 0
            @@self.memory[self[:addr]] = data % 0x100
          else
            @@self.memory[self[:addr]] = data % 0x100
            @@self.memory[self[:addr]+1] = (data >> 8) % 0x100
          end
        when "imm"
          throw "Immediate data cannot be assigned"
        end
      end

      def data
        case self[:class]
        when "reg" then @@self.method(self[:name]).call
        when "imm" then self[:value]
        when "mem" then @@self.getmem(self[:addr]) + (self[:word] == 1 ? (@@self.getmem(self[:addr] + 1) << 8) : 0)
        end
      end

      def addr
        self[:addr] if self[:class] == "mem"
      end
      def eaad # EA
        self[:addr] - self[:base] if self[:class] == "mem"
      end
    end

  end
  attr_accessor :memory, :FLAG, :AX, :BX, :CX, :DX, :SI, :DI, :BP, :SP, :PC, :CS, :DS, :ES, :SS
  attr_reader :disass, :pos, :codeparse, :DataEle

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
      (@FLAG & 1 << flag[1]).zero?.!.to_i
    end
    define_method (flag[0]+"=").to_sym do |a|
      @FLAG = (@FLAG & ~(1 << flag[1])) + ((!!a.to_i.nonzero?).to_i << flag[1])
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
      self.instance_variable_set("@"+reg+"X", (self.instance_variable_get("@"+reg+"X") & 0xff) + ((val % 0x100) << 8) )
    end
  end

  include InstructionSet

  def load_code(code)
    if code.class == Array
      @codeline = code.length
      @memory[(@CS*16)..(@CS*16+@codeline)] = code.map { |e| e % 0x100 }
    else
      n = 0
      loop do
        @memory[@CS*16 + n] = code.read_nonblock(1).ord rescue break
        n += 1
      end
      @codeline = n+1
    end
  end

  def parse_code
    @codeline rescue throw "need load code first"
    @disass = true
    @codeparse = []
    pc = @PC
    while @PC < @codeline
      @codeparse << step
    end
    @PC = pc
    @codeparse.map { |e| e[0] = e[0] + @CS * 16;e }
    @disass = false
  end

  def getmem(addr)
    a = @memory[addr]
    a = a ? a % 0x100 : 0
  end

  def fetch(w)
    if w == 1
      fetchw
    else
      fetchb
    end
  end

  def fetchb
    b = @memory[@CS * 16 + @PC]
    b = b ? b % 0x100 : 0
    @PC += 1
    b
  end

  def fetchw
    fetchb + (fetchb << 8)
  end

  def push(el)
    el = @DataEle.imm(el,1) if el.class == Integer
    sp  = @DataEle.reg("SP")
    sp.data = sp.data - 2
    top = @DataEle.mem(sp.data,"SS",1)
    top.data = el.data
    el
  end

  def pop(el = nil)
    sp  = @DataEle.reg("SP")
    top = @DataEle.mem(sp.data,"SS",1)
    if el
      el.data = top.data
    else
      el = @DataEle.imm(top.data,1)
    end
    top.data = 0
    sp.data = sp.data + 2
    el
  end

  def test(*op)
    @@ref
  end

  # run and debug

  def step
    op = []
    @pos = @PC
    flag = false
    @@instruction_set.each do |m|
      flag = true
      m[:match].each_with_index do |s,i|
        op << fetchb unless op[i]
        unless (op[i] & s[:mask]) == s[:match]
          flag = false
          break
        end
      end
      if flag
        code = self.instance_exec(*(m[:par].map { |e| ((op[e[:ord]] & (("1"*e[:len]).to_i(2) << e[:pos])) >> e[:pos]) }), &m[:act])
        return [@pos, *code]
      end
    end
    return [@pos, "unknown"] if @disass
    throw "unknown operator at #{@pos}" unless flag
  end

  def stack
    begin
      raw = @memory[(@SS * 16 + @SP)..(@SS * 16 + @first_SP - 1)]
      stack = []
      raw.each_index { |e| stack.insert 0, raw[e] + (raw[e+1] << 8) if e % 2 == 0 }
      stack
    rescue Exception => e
      []
    end
  end

  def clear
    @AX, @BX, @CX, @DX = 0, 0, 0, 0
    @SI, @DI, @BP, @SP = 0, 0, 0, 0x400
    @first_SP = 0x400
    @PC = 0
    @CS, @DS, @ES, @SS = 0x800, 0, 0, 0x400
    @FLAG = 0
    @memory = []
    @disass = false
  end

  def halt
    puts "cpu halt"
  end

end
