class CPU
  def initialize(copy=nil)
    unless copy
      @AX, @BX, @CX, @DX = 0, 0, 0, 0
      @SI, @DI, @BP, @SP = 0, 0, 0, 0
      @PC = 0
      @CS, @DS, @ES, @SS = 0x800, 0, 0, 0
      @FLAG = 0
      @memory = []
    end
  end
  attr_reader :AX, :BX, :CX, :DX, :SI, :DI, :BP, :SP, :PC, :CS, :DS, :ES, :SS
  attr_accessor :memory, :FLAG

  # Flags
  [
    [:CF, 0],
    [:PF, 2],
    [:AF, 4],
    [:ZF, 6],
    [:SF, 7],
    [:TF, 8],
    [:IF, 9],
    [:DF, 10],
    [:OF, 11],
  ].each do |flag|
    define_method flag[0] do
      (@FLAG & 1 << flag[1]).zero?.!
    end
  end

  # load code
  def load_code(code)
    unless code.class.method_defined? "read"
      throw "file class error"
    end
    ps = @CS * 16
    loop do
      s = code.read(1).ord rescue break
      @memory[ps] = s
      ps += 1
    end
  end

  # get data

  def getb
    ans = @memory[@PC + @CS * 16]
    @PC += 1
    ans
  end

  def getw
    getb + (getb << 8)
  end

  # code
  # http://datasheets.chipdb.org/Intel/x86/808x/datashts/8086/231455-006.pdf

  def method_name

  end

end
