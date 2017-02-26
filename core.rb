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
  end
  attr_accessor :memory, :FLAG, :AX, :BX, :CX, :DX, :SI, :DI, :BP, :SP, :PC, :CS, :DS, :ES, :SS
  attr_reader :disass, :pos, :codeparse

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

  def mem(a)
    ans = @memory[a]
    ans = ans ? ans % 0xff : 0
  end

  def get(a)
    self.method(a).call
  end

  def set(a,b)
    self.method(a+"=").call b
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
  rm_sel = lambda do |mod,w,rm,_|
    case mod
    when 3 then return @@reg_tab[w][rm]
    else
      memaddr = 0x10 * _.get("DS")
      disp = 0
      if (mod == 0) && (rm == 6)
        memaddr += _.fetchw
        detail = "[%04xH]" % disp
      else
        disp = case mod
        when 0 then 0
        when 1 then _.fetchb
        when 2 then _.fetchw
        end
        memaddr += @@rm_tab[rm].map { |e| _.get(e) }.sum + disp
        detail = "[#{@@rm_tab[rm].join('+')}#{
          unless mod.zero?
            "+%0#{mod * 2}xH" % disp
          end
        }]"
      end
      return [memaddr, detail]
    end
  end

  # load code
  def load_code(code)
    ps = @CS * 16
    if code.class == Array
      @memory[ps..-1] = code.map { |e| e % 0x100 }
      @codeline = code.length
      return
    end
    unless code.class.method_defined? "read"
      throw "file class error"
    end
    loop do
      s = code.read(1).ord rescue break
      @memory[ps] = s
      ps += 1
    end
    @codeline = ps - @CS * 16
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

  # get data

  def fetchb
    ans = @memory[@PC + @CS * 16]
    ans = ans ? ans : 0
    @PC += 1
    ans
  end

  def fetchw
    fetchb + (fetchb << 8)
  end

  # code
  # http://datasheets.chipdb.org/Intel/x86/808x/datashts/8086/231455-006.pdf
  @@op_set = []
  set_op = lambda do |op,&act|
    match = {:match => [], :par => []}
    op = op.gsub(' ','')
    while op =~ /{(\w+)}|([a-z])/
      f = $2 ? $2 : $1
      offset = op.index($&)
      case
      when f.length == 1
        op[$&] = "*"
        match[:par] << { :name => f, :pos => offset, :len => 1 }
      when f == "mod", f == "seg"
        op[$&] = "**"
        match[:par] << { :name => f, :pos => offset, :len => 2 }
      else
        op[$&] = "***"
        match[:par] << { :name => f, :pos => offset, :len => 3 }
      end
    end
    # match[:match] = op
    if (op.length % 8).zero?
      (op.length / 8).times do |i|
        part = op[i*8..i*8+7]
        mask = part.gsub(/\d/,'1').gsub('*','0').to_i(2)
        ma = part.gsub('*','0').to_i(2)
        match[:match] << {:match => ma, :mask => mask}
      end
      match[:par].each do |a|
        a[:ord] = a[:pos] / 8
        a[:pos] = 7 - (a[:pos] % 8 + (a[:len] - 1))
      end
    else
      throw "error code"
    end
    match[:act] = act
    @@op_set << match
    match
  end

  ## DATA TRANSFER
  ### MOV = Move
  set_op.call "1000 10dw  {mod} {reg} {rm}" do |op,_|
    # Register/Memory from/to Register
    d,w,mod,reg,rm = *op
    detail = nil
    rmv = rm_sel.call(mod, w, rm, _)
    case mod
    when 3
      if d == 0
        from = @@reg_tab[w][reg]
        to   = rmv
      else
        from = rmv
        to   = @@reg_tab[w][reg]
      end
      _.set(to,_.get(from)) unless _.disass
      detail = "#{to}, #{from}"
    else
      memaddr = rmv[0]
      if d == 0
        unless _.disass
          case w
          when 0
            _.memory[memaddr] = _.get(@@reg_tab[w][reg])
          when 1
            v = _.get(@@reg_tab[w][reg])
            _.memory[memaddr] = v & 0xff
            _.memory[memaddr+1] = v >> 8
          end
        end
        detail = "#{rmv[1]}, #{@@reg_tab[w][reg]}"
      else
        unless _.disass
          case w
          when 0
            _.set(@@reg_tab[w][reg],_.mem(memaddr))
          when 1
            _.set(@@reg_tab[w][reg],_.mem(memaddr) + (_.mem(memaddr+1) << 8))
          end
        end
        detail = "#{@@reg_tab[w][reg]}, #{rmv[1]}"
      end
    end

    # code << to + ", " + frombn
    # puts code.join("\t")
    detail = "MOV #{@@d_tag[d]} #{@@w_tag[w]} #{mod} #{@@reg_tab[w][reg]} #{rm}" unless detail
    [_.pos,"MOV",detail]
  end
  set_op.call "1100 011w {mod} 000 {rm}" do |op,_|
    w,mod,rm = *op
    detail = nil

    [_.pos,"MOV",detail]
  end
  set_op.call "1011 w{reg}" do |op,_|
    # Immediate to Register
    w,reg = *op
    data = (w == 1) ? _.fetchw : _.fetchb
    _.set(@@reg_tab[w][reg],data) unless _.disass
    [_.pos,"MOV","#{@@reg_tab[w][reg]}, #{(w == 1) ? ( "0%04xH" % data ) : ( "0%02xH" % data )}"]
  end

  set_op.call "00000000" do |op,_|
    [_.pos,"no op",""]
  end


  # run and debug

  def step
    @disass = false
    op = []
    @pos = @PC
    flag = false
    @@op_set.each do |m|
      flag = true
      m[:match].each_with_index do |s,i|
        op << fetchb unless op[i]
        unless (op[i] & s[:mask]) == s[:match]
          flag = false
          break
        end
      end
      if flag
        return m[:act].call (m[:par].map { |e| ((op[e[:ord]] & (("1"*e[:len]).to_i(2) << e[:pos])) >> e[:pos]) }), self
        break
      end
    end
    throw "unknown operator at #{@pos}" unless flag
  end

  def clear
    @AX, @BX, @CX, @DX = 0, 0, 0, 0
    @SI, @DI, @BP, @SP = 0, 0, 0, 0
    @PC = 0
    @CS, @DS, @ES, @SS = 0x800, 0, 0, 0
    @FLAG = 0
    @memory[0..0xfff] = @memory[0..0xfff].map { |e| 0 }
    @disass = false
  end

end
