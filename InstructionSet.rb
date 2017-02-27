class FalseClass; def to_i; 0 end end
class TrueClass;  def to_i; 1 end end
@ins_set = []
def instruction_define(op, &act)
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
  @ins_set << match
  match
end

# code
# http://datasheets.chipdb.org/Intel/x86/808x/datashts/8086/231455-006.pdf

## DATA TRANSFER
### MOV: Move
instruction_define "1000 10dw {mod} {reg} {rm}" do |d,w,mod,reg,rm|
  # Register/Memory from/to Register
  src = @DataEle.reg(reg,w)
  obj = @DataEle.r_mem(mod,rm,w)
  obj, src = src, obj if d == 1
  obj.data = src.data unless @disass
  ["MOV","#{obj[:sign]}, #{src[:sign]}"]
end
instruction_define "1100 011w {mod} 000 {rm}" do |w,mod,rm|
  # Immediate to Register/Memory
  obj = @DataEle.r_mem(mod,rm,w)
  src = @DataEle.imm(fetch(w))
  obj.data = src.data unless @disass
  ["MOV","#{obj[:sign]}, #{src[:sign]}"]
end
instruction_define "1011 w{reg}" do |w,reg|
  # Immediate to Register
  obj = @DataEle.reg(reg,w)
  src = @DataEle.imm(fetch(w))
  obj.data = src.data unless @disass
  ["MOV","#{obj[:sign]}, #{src[:sign]}"]
end
instruction_define "1010 00dw" do |d,w|
  # Memory to/from Accumulator
  obj = @DataEle.reg("AX")
  src = @DataEle.mem(fetchw,"DS",w)
  obj, src = src, obj if d == 1
  obj.data = src.data unless @disass
  ["MOV","#{obj[:sign]}, #{src[:sign]}"]
end
instruction_define "1000 11d0 {mod} 0 {seg} {rm}" do |d,mod,seg,rm|
  # Register/Memory from/to Segment Register
  obj = @DataEle.r_mem(mod,rm,1)
  src = @DataEle.seg(seg)
  obj, src = src, obj if d == 1
  obj.data = src.data unless @disass
  ["MOV","#{obj[:sign]}, #{src[:sign]}"]
end

### PUSH: Push
instruction_define "1111 1111 {mod} 110 {rm}" do |mod,rm|
  # Register/Memory
  src = @DataEle.r_mem(mod,rm,1)
  sp  = @DataEle.reg("SP")
  unless @disass
    sp.data = sp.data - 2
    top = @DataEle.mem(sp.data,"SS",1)
    top.data = src.data
  end
  ["PUSH", src[:sign]]
end
instruction_define "0101 0{reg}" do |reg|
  # Register
  src = @DataEle.reg(reg,1)
  sp  = @DataEle.reg("SP")
  unless @disass
    sp.data = sp.data - 2
    top = @DataEle.mem(sp.data,"SS",1)
    top.data = src.data
  end
  ["PUSH", src[:sign]]
end
instruction_define "000 {seg} 110" do |seg|
  # Segment Register
  src = @DataEle.seg(seg)
  sp  = @DataEle.reg("SP")
  unless @disass
    sp.data = sp.data - 2
    top = @DataEle.mem(sp.data,"SS",1)
    top.data = src.data
  end
  ["PUSH", src[:sign]]
end

### POP: Pop
instruction_define "1000 1111 {mod} 000 {rm}" do |mod,rm|
  # Register/Memory
  obj = @DataEle.r_mem(mod,rm,1)
  sp  = @DataEle.reg("SP")
  unless @disass
    top = @DataEle.mem(sp.data,"SS",1)
    obj.data = top.data
    top.data = 0
    sp.data = sp.data + 2
  end
  ["POP", obj[:sign]]
end
instruction_define "0101 1{reg}" do |reg|
  # Register
  obj = @DataEle.reg(reg,1)
  sp  = @DataEle.reg("SP")
  unless @disass
    top = @DataEle.mem(sp.data,"SS",1)
    obj.data = top.data
    top.data = 0
    sp.data = sp.data + 2
  end
  ["POP", obj[:sign]]
end
instruction_define "000{seg}111" do |seg|
  # Register/Memory
  obj = @DataEle.seg(seg)
  sp  = @DataEle.reg("SP")
  unless @disass
    top = @DataEle.mem(sp.data,"SS",1)
    obj.data = top.data
    top.data = 0
    sp.data = sp.data + 2
  end
  ["POP", obj[:sign]]
end

### XCHG: Exchange
instruction_define "1000 011w {mod}{reg}{rm}" do |w,mod,reg,rm|
  a = @DataEle.reg(reg,w)
  b = @DataEle.r_mem(mod,rm,w)
  a.data, b.data = b.data, a.data unless @disass
  ["XCHG",a.sign + ", " + b.sign]
end
instruction_define "1001 0{reg}" do |reg|
  a = @DataEle.reg("AX")
  b = @DataEle.reg(reg,1)
  a.data, b.data = b.data, a.data unless @disass
  ["XCHG",a.sign + ", " + b.sign]
end

### LEA: Load EA to Register
instruction_define "1000 1101 {mod}{reg}{rm}" do |mod,reg,rm|
  obj = @DataEle.reg(reg,1)
  src = @DataEle.r_mem(mod,rm,1)
  obj.data = src.eaad unless @disass
  ["LEA",obj[:sign] + ", " + src[:sign]]
end
### LDS: Load Pointer to DS
instruction_define "1100 0101 {mod}{reg}{rm}" do |mod,reg,rm|
  obj = @DataEle.reg(reg,1)
  src = @DataEle.r_mem(mod,rm,1)
  ds = @DataEle.reg("DS")
  ds_src = @DataEle.r_mem(src.base + 2)
  obj.data, ds.data = src.data, ds_src.data unless @disass
  ["LDS",obj[:sign] + ", " + src[:sign]]
end
### LES: Load Pointer to ES
instruction_define "1100 0101 {mod}{reg}{rm}" do |mod,reg,rm|
  obj = @DataEle.reg(reg,1)
  src = @DataEle.r_mem(mod,rm,1)
  es = @DataEle.reg("ES")
  es_src = @DataEle.r_mem(src.base + 2)
  obj.data, es.data = src.data, es_src.data unless @disass
  ["LES",obj[:sign] + ", " + src[:sign]]
end

##ARITHMETIC
### ADD: Add
instruction_define "0000 00dw {mod} {reg} {rm}" do |d,w,mod,reg,rm|
  # Reg/Memory with Register to Either
  # TODO: unknown operation need to ensure
  obj = @DataEle.reg(reg,w)
  src = @DataEle.r_mem(mod,rm,w)
  obj, src = src, obj if d == 1
  unless @disass
    v = w + 1
    mask = 1 << (v * 8)
    half_mask = 1 << (v * 4)
    sum, od, sd = obj.data + src.data, obj.data, src.data
    self.ZF = (sum % mask).zero?
    self.AF = (od - (od & (half_mask - 1))) + (sd - (sd & (half_mask - 1))) != (sum - (sum & (half_mask - 1)))
    self.CF = sum / mask
    self.SF = sum & (1 << (v * 8 - 1))
    self.PF = (0..7).map { |e| ((1 << e) & sum).zero?.!.to_i }.sum % 2 + 1
    self.OF = ((od & (1 << (v * 8 - 1))) == sd & (1 << (v * 8 - 1))) ? ((od & (1 << (v * 8 - 1))) != sum & (1 << (v * 8 - 1))) : false
    obj.data = sum % mask
  end
  ["ADD","#{obj[:sign]}, #{src[:sign]}"]
end
instruction_define "1000 00sw {mod} 000 {rm}" do |s,w,mod,rm|
  # Immediate to Register/Memory
  # TODO: unknown operation need to ensure
  src = @DataEle.imm(fetch((s<<1)+w),w)
  obj = @DataEle.r_mem(mod,rm,w)
  unless @disass
    v = w + 1
    mask = 1 << (v * 8)
    half_mask = 1 << (v * 4)
    sum, od, sd = obj.data + src.data, obj.data, src.data
    self.ZF = (sum % mask).zero?
    self.AF = (od - (od & (half_mask - 1))) + (sd - (sd & (half_mask - 1))) != (sum - (sum & (half_mask - 1)))
    self.CF = sum / mask
    self.SF = sum & (1 << (v * 8 - 1))
    self.PF = (0..7).map { |e| ((1 << e) & sum).zero?.!.to_i }.sum % 2 + 1
    self.OF = ((od & (1 << (v * 8 - 1))) == sd & (1 << (v * 8 - 1))) ? ((od & (1 << (v * 8 - 1))) != sum & (1 << (v * 8 - 1))) : false
    obj.data = sum % mask
  end
  ["ADD","#{obj[:sign]}, #{src[:sign]}"]
end
instruction_define "0000 010w" do |w|
  # Immediate to Accumulator
  # TODO: unknown operation need to ensure
  src = @DataEle.imm(fetch(w))
  obj = @DataEle.reg(0,w)
  unless @disass
    v = w + 1
    mask = 1 << (v * 8)
    half_mask = 1 << (v * 4)
    sum, od, sd = obj.data + src.data, obj.data, src.data
    self.ZF = (sum % mask).zero?
    self.AF = (od - (od & (half_mask - 1))) + (sd - (sd & (half_mask - 1))) != (sum - (sum & (half_mask - 1)))
    self.CF = sum / mask
    self.SF = sum & (1 << (v * 8 - 1))
    self.PF = (0..7).map { |e| ((1 << e) & sum).zero?.!.to_i }.sum % 2 + 1
    self.OF = ((od & (1 << (v * 8 - 1))) == sd & (1 << (v * 8 - 1))) ? ((od & (1 << (v * 8 - 1))) != sum & (1 << (v * 8 - 1))) : false
    obj.data = sum % mask
  end
  ["ADD","#{obj[:sign]}, #{src[:sign]}"]
end

### ADC: Add with Carry
instruction_define "0001 00dw {mod} {reg} {rm}" do |d,w,mod,reg,rm|
  # Reg/Memory with Register to Either
  # TODO: unknown operation need to ensure
  obj = @DataEle.reg(reg,w)
  src = @DataEle.r_mem(mod,rm,w)
  obj, src = src, obj if d == 1
  unless @disass
    v = w + 1
    mask = 1 << (v * 8)
    half_mask = 1 << (v * 4)
    sum, od, sd = obj.data + src.data, obj.data, src.data + self.CF
    self.ZF = (sum % mask).zero?
    self.AF = (od - (od & (half_mask - 1))) + (sd - (sd & (half_mask - 1))) != (sum - (sum & (half_mask - 1)))
    self.CF = sum / mask
    self.SF = sum & (1 << (v * 8 - 1))
    self.PF = (0..7).map { |e| ((1 << e) & sum).zero?.!.to_i }.sum % 2 + 1
    self.OF = ((od & (1 << (v * 8 - 1))) == sd & (1 << (v * 8 - 1))) ? ((od & (1 << (v * 8 - 1))) != sum & (1 << (v * 8 - 1))) : false
    obj.data = sum % mask
  end
  ["ADD","#{obj[:sign]}, #{src[:sign]}"]
end
instruction_define "1000 00sw {mod} 010 {rm}" do |s,w,mod,rm|
  # Immediate to Register/Memory
  # TODO: unknown operation need to ensure
  src = @DataEle.imm(fetch((s<<1)+w),w)
  obj = @DataEle.r_mem(mod,rm,w)
  unless @disass
    v = w + 1
    mask = 1 << (v * 8)
    half_mask = 1 << (v * 4)
    sum, od, sd = obj.data + src.data, obj.data, src.data + self.CF
    self.ZF = (sum % mask).zero?
    self.AF = (od - (od & (half_mask - 1))) + (sd - (sd & (half_mask - 1))) != (sum - (sum & (half_mask - 1)))
    self.CF = sum / mask
    self.SF = sum & (1 << (v * 8 - 1))
    self.PF = (0..7).map { |e| ((1 << e) & sum).zero?.!.to_i }.sum % 2 + 1
    self.OF = ((od & (1 << (v * 8 - 1))) == sd & (1 << (v * 8 - 1))) ? ((od & (1 << (v * 8 - 1))) != sum & (1 << (v * 8 - 1))) : false
    obj.data = sum % mask
  end
  ["ADD","#{obj[:sign]}, #{src[:sign]}"]
end
instruction_define "0001 010w" do |w|
  # Immediate to Accumulator
  # TODO: unknown operation need to ensure
  src = @DataEle.imm(fetch(w))
  obj = @DataEle.reg(0,w)
  unless @disass
    v = w + 1
    mask = 1 << (v * 8)
    half_mask = 1 << (v * 4)
    sum, od, sd = obj.data + src.data, obj.data, src.data + self.CF
    self.ZF = (sum % mask).zero?
    self.AF = (od - (od & (half_mask - 1))) + (sd - (sd & (half_mask - 1))) != (sum - (sum & (half_mask - 1)))
    self.CF = sum / mask
    self.SF = sum & (1 << (v * 8 - 1))
    self.PF = (0..7).map { |e| ((1 << e) & sum).zero?.!.to_i }.sum % 2 + 1
    self.OF = ((od & (1 << (v * 8 - 1))) == sd & (1 << (v * 8 - 1))) ? ((od & (1 << (v * 8 - 1))) != sum & (1 << (v * 8 - 1))) : false
    obj.data = sum % mask
  end
  ["ADD","#{obj[:sign]}, #{src[:sign]}"]
end

ins_set = @ins_set
InstructionSet = Module.new do
  class_variable_set(:@@instruction_set, ins_set)
end
