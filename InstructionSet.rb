class FalseClass; def to_i; 0 end end
class TrueClass;  def to_i; 1 end end

class Integer
  def withsign(w=0)
    v = (w+1)*8
    if (self & (1 << (v-1))).nonzero?
      self - (1 << v)
    else
      self
    end
  end
  def !
    self.zero?
  end
end
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
  push src unless @disass
  ["PUSH", src[:sign]]
end
instruction_define "0101 0{reg}" do |reg|
  # Register
  src = @DataEle.reg(reg,1)
  push src unless @disass
  ["PUSH", src[:sign]]
end
instruction_define "000 {seg} 110" do |seg|
  # Segment Register
  src = @DataEle.seg(seg)
  push src unless @disass
  ["PUSH", src[:sign]]
end

### POP: Pop
instruction_define "1000 1111 {mod} 000 {rm}" do |mod,rm|
  # Register/Memory
  obj = @DataEle.r_mem(mod,rm,1)
  pop obj unless @disass
  ["POP", obj[:sign]]
end
instruction_define "0101 1{reg}" do |reg|
  # Register
  obj = @DataEle.reg(reg,1)
  pop obj unless @disass
  ["POP", obj[:sign]]
end
instruction_define "000{seg}111" do |seg|
  # Register/Memory
  obj = @DataEle.seg(seg)
  pop obj unless @disass
  ["POP", obj[:sign]]
end

### XCHG: Exchange
instruction_define "1000 011w {mod}{reg}{rm}" do |w,mod,reg,rm|
  a = @DataEle.r_mem(mod,rm,w)
  b = @DataEle.reg(reg,w)
  a.data, b.data = b.data, a.data unless @disass
  ["XCHG",a.sign + ", " + b.sign]
end
instruction_define "1001 0{reg}" do |reg|
  a = @DataEle.reg("AX")
  b = @DataEle.reg(reg,1)
  if b.sign == "AX"
    ["NOP"]
  else
    a.data, b.data = b.data, a.data unless @disass
    ["XCHG",a.sign + ", " + b.sign]
  end
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
  ds_src = @DataEle.mem(src.eaad + 2)
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
  src = @DataEle.reg(reg,w)
  obj = @DataEle.r_mem(mod,rm,w)
  obj, src = src, obj if d == 1
  unless @disass
    v = w + 1
    mask = 1 << (v * 8)
    sum, od, sd = obj.data + src.data, obj.data, src.data
    self.ZF = (sum % mask).zero?
    self.AF = (od % 0x10 + sd % 0x10) / 0x10
    self.CF = sum / mask
    self.SF = sum & (1 << (v * 8 - 1))
    self.PF = (0..(v*2-1)).map { |e| ((1 << e) & sum).zero?.!.to_i }.sum % 2 + 1
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
    sum, od, sd = obj.data + src.data, obj.data, src.data
    self.ZF = (sum % mask).zero?
    self.AF = (od % 0x10 + sd % 0x10) / 0x10
    self.CF = sum / mask
    self.SF = sum & (1 << (v * 8 - 1))
    self.PF = (0..(v*2-1)).map { |e| ((1 << e) & sum).zero?.!.to_i }.sum % 2 + 1
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
    sum, od, sd = obj.data + src.data, obj.data, src.data
    self.ZF = (sum % mask).zero?
    self.AF = (od % 0x10 + sd % 0x10) / 0x10
    self.CF = sum / mask
    self.SF = sum & (1 << (v * 8 - 1))
    self.PF = (0..(v*2-1)).map { |e| ((1 << e) & sum).zero?.!.to_i }.sum % 2 + 1
    self.OF = ((od & (1 << (v * 8 - 1))) == sd & (1 << (v * 8 - 1))) ? ((od & (1 << (v * 8 - 1))) != sum & (1 << (v * 8 - 1))) : false
    obj.data = sum % mask
  end
  ["ADD","#{obj[:sign]}, #{src[:sign]}"]
end

### ADC: Add with Carry
instruction_define "0001 00dw {mod} {reg} {rm}" do |d,w,mod,reg,rm|
  # Reg/Memory with Register to Either
  # TODO: unknown operation need to ensure
  src = @DataEle.reg(reg,w)
  obj = @DataEle.r_mem(mod,rm,w)
  obj, src = src, obj if d == 1
  unless @disass
    v = w + 1
    mask = 1 << (v * 8)
    sum, od, sd = obj.data + src.data + self.CF, obj.data, src.data + self.CF
    self.ZF = (sum % mask).zero?
    self.AF = (od % 0x10 + sd % 0x10) / 0x10
    self.CF = sum / mask
    self.SF = sum & (1 << (v * 8 - 1))
    self.PF = (0..(v*2-1)).map { |e| ((1 << e) & sum).zero?.!.to_i }.sum % 2 + 1
    self.OF = ((od & (1 << (v * 8 - 1))) == sd & (1 << (v * 8 - 1))) ? ((od & (1 << (v * 8 - 1))) != sum & (1 << (v * 8 - 1))) : false
    obj.data = sum % mask
  end
  ["ADC","#{obj[:sign]}, #{src[:sign]}"]
end
instruction_define "1000 00sw {mod} 010 {rm}" do |s,w,mod,rm|
  # Immediate to Register/Memory
  # TODO: unknown operation need to ensure
  src = @DataEle.imm(fetch((s<<1)+w),w)
  obj = @DataEle.r_mem(mod,rm,w)
  unless @disass
    v = w + 1
    mask = 1 << (v * 8)
    sum, od, sd = obj.data + src.data + self.CF, obj.data, src.data + self.CF
    self.ZF = (sum % mask).zero?
    self.AF = (od % 0x10 + sd % 0x10) / 0x10
    self.CF = sum / mask
    self.SF = sum & (1 << (v * 8 - 1))
    self.PF = (0..(v*2-1)).map { |e| ((1 << e) & sum).zero?.!.to_i }.sum % 2 + 1
    self.OF = ((od & (1 << (v * 8 - 1))) == sd & (1 << (v * 8 - 1))) ? ((od & (1 << (v * 8 - 1))) != sum & (1 << (v * 8 - 1))) : false
    obj.data = sum % mask
  end
  ["ADC","#{obj[:sign]}, #{src[:sign]}"]
end
instruction_define "0001 010w" do |w|
  # Immediate to Accumulator
  # TODO: unknown operation need to ensure
  src = @DataEle.imm(fetch(w))
  obj = @DataEle.reg(0,w)
  unless @disass
    v = w + 1
    mask = 1 << (v * 8)
    sum, od, sd = obj.data + src.data + self.CF, obj.data, src.data + self.CF
    self.ZF = (sum % mask).zero?
    self.AF = (od % 0x10 + sd % 0x10) / 0x10
    self.CF = sum / mask
    self.SF = sum & (1 << (v * 8 - 1))
    self.PF = (0..(v*2-1)).map { |e| ((1 << e) & sum).zero?.!.to_i }.sum % 2 + 1
    self.OF = ((od & (1 << (v * 8 - 1))) == sd & (1 << (v * 8 - 1))) ? ((od & (1 << (v * 8 - 1))) != sum & (1 << (v * 8 - 1))) : false
    obj.data = sum % mask
  end
  ["ADC","#{obj[:sign]}, #{src[:sign]}"]
end

### INC: Increment
instruction_define "1111 111w {mod} 000 {rm}" do |w,mod,rm|
  # Reg/Memory
  obj = @DataEle.r_mem(mod,rm,w)
  unless @disass
    v = 2
    mask = 1 << (v * 8)
    sum, od, sd = obj.data + 1, obj.data, 1
    self.ZF = (sum % mask).zero?
    self.AF = (od % 0x10 + sd % 0x10) / 0x10
    self.SF = sum & (1 << (v * 8 - 1))
    self.PF = (0..(v*2-1)).map { |e| ((1 << e) & sum).zero?.!.to_i }.sum % 2 + 1
    self.OF = ((od & (1 << (v * 8 - 1))) == sd & (1 << (v * 8 - 1))) ? ((od & (1 << (v * 8 - 1))) != sum & (1 << (v * 8 - 1))) : false
    obj.data = sum % mask
  end
  ["INC","#{obj[:sign]}"]
end
instruction_define "0100 0{reg}" do |reg|
  # Reg/Memory
  obj = @DataEle.reg(reg,1)
  unless @disass
    v = 2
    mask = 1 << (v * 8)
    sum, od, sd = obj.data + 1, obj.data, 1
    self.ZF = (sum % mask).zero?
    self.AF = (od % 0x10 + sd % 0x10) / 0x10
    self.SF = sum & (1 << (v * 8 - 1))
    self.PF = (0..(v*2-1)).map { |e| ((1 << e) & sum).zero?.!.to_i }.sum % 2 + 1
    self.OF = ((od & (1 << (v * 8 - 1))) == sd & (1 << (v * 8 - 1))) ? ((od & (1 << (v * 8 - 1))) != sum & (1 << (v * 8 - 1))) : false
    obj.data = sum % mask
  end
  ["INC","#{obj[:sign]}"]
end

### AAA: ASCII Adjust for Add
instruction_define "0011 0111" do
  unless @disass
    al = @DataEle.reg("AL")
    if (al.data & 0xf) > 9 || self.AF == 1
      ah = @DataEle.reg("AH")
      al.data = al.data + 6
      self.AF = (od % 0x10 + sd % 0x10) / 0x10
      self.CF = 1
      ah.data = ah.data + 1
    end
    al.data = al.data & 0xf
  end
  ["AAA"]
end

### SUB: Subtract
instruction_define "0010 10dw {mod} {reg} {rm}" do |d,w,mod,reg,rm|
  # Reg/Memory with Register to Either
  # TODO: unknown operation need to ensure
  src = @DataEle.reg(reg,w)
  obj = @DataEle.r_mem(mod,rm,w)
  obj, src = src, obj if d == 1
  unless @disass
    v = w + 1
    mask = 1 << (v * 8)
    od, sd = obj.data, (-src.data) % mask
    sum = od + sd
    self.ZF = (sum % mask).zero?
    # TODO: AF unsure
    self.AF = (od % 0x10 + sd % 0x10) / 0x10
    # TODO: CF unsure
    self.CF = (sum / mask > 0).!
    self.SF = sum & (1 << (v * 8 - 1))
    self.PF = (0..(v*2-1)).map { |e| ((1 << e) & sum).zero?.!.to_i }.sum % 2 + 1
    self.OF = ((od & (1 << (v * 8 - 1))) == sd & (1 << (v * 8 - 1))) ? ((od & (1 << (v * 8 - 1))) != sum & (1 << (v * 8 - 1))) : false
    obj.data = sum % mask
  end
  ["SUB","#{obj[:sign]}, #{src[:sign]}"]
end
instruction_define "1000 00sw {mod} 101 {rm}" do |s,w,mod,rm|
  # Immediate to Register/Memory
  # TODO: unknown operation need to ensure
  src = @DataEle.imm(fetch((s<<1)+w),w)
  obj = @DataEle.r_mem(mod,rm,w)
  unless @disass
    v = w + 1
    mask = 1 << (v * 8)
    od, sd = obj.data, (-src.data) % mask
    sum = od + sd
    self.ZF = (sum % mask).zero?
    # TODO: AF unsure
    self.AF = (od % 0x10 + sd % 0x10) / 0x10
    # TODO: CF unsure
    self.CF = (sum / mask > 0).!
    self.SF = sum & (1 << (v * 8 - 1))
    self.PF = (0..(v*2-1)).map { |e| ((1 << e) & sum).zero?.!.to_i }.sum % 2 + 1
    self.OF = ((od & (1 << (v * 8 - 1))) == sd & (1 << (v * 8 - 1))) ? ((od & (1 << (v * 8 - 1))) != sum & (1 << (v * 8 - 1))) : false
    obj.data = sum % mask
  end
  ["SUB","#{obj[:sign]}, #{src[:sign]}"]
end
instruction_define "0010 110w" do |w|
  # Immediate to Accumulator
  # TODO: unknown operation need to ensure
  src = @DataEle.imm(fetch(+w),w)
  obj = @DataEle.mem(0,w)
  unless @disass
    v = w + 1
    mask = 1 << (v * 8)
    od, sd = obj.data, (-src.data) % mask
    sum = od + sd
    self.ZF = (sum % mask).zero?
    # TODO: AF unsure
    self.AF = (od % 0x10 + sd % 0x10) / 0x10
    # TODO: CF unsure
    self.CF = (sum / mask > 0).!
    self.SF = sum & (1 << (v * 8 - 1))
    self.PF = (0..(v*2-1)).map { |e| ((1 << e) & sum).zero?.!.to_i }.sum % 2 + 1
    self.OF = ((od & (1 << (v * 8 - 1))) == sd & (1 << (v * 8 - 1))) ? ((od & (1 << (v * 8 - 1))) != sum & (1 << (v * 8 - 1))) : false
    obj.data = sum % mask
  end
  ["SUB","#{obj[:sign]}, #{src[:sign]}"]
end

### SBB: Subtract with Borrow
instruction_define "0001 10dw {mod} {reg} {rm}" do |d,w,mod,reg,rm|
  # Reg/Memory with Register to Either
  # TODO: unknown operation need to ensure
  src = @DataEle.reg(reg,w)
  obj = @DataEle.r_mem(mod,rm,w)
  obj, src = src, obj if d == 1
  unless @disass
    v = w + 1
    mask = 1 << (v * 8)
    od, sd = obj.data, (-src.data - self.CF) % mask
    sum = od + sd
    self.ZF = (sum % mask).zero?
    # TODO: AF unsure
    self.AF = (od % 0x10 + sd % 0x10) / 0x10
    # TODO: CF unsure
    self.CF = (sum / mask > 0).!
    self.SF = sum & (1 << (v * 8 - 1))
    self.PF = (0..(v*2-1)).map { |e| ((1 << e) & sum).zero?.!.to_i }.sum % 2 + 1
    self.OF = ((od & (1 << (v * 8 - 1))) == sd & (1 << (v * 8 - 1))) ? ((od & (1 << (v * 8 - 1))) != sum & (1 << (v * 8 - 1))) : false
    obj.data = sum % mask
  end
  ["SBB","#{obj[:sign]}, #{src[:sign]}"]
end
instruction_define "1000 00sw {mod} 011 {rm}" do |s,w,mod,rm|
  # Immediate to Register/Memory
  # TODO: unknown operation need to ensure
  src = @DataEle.imm(fetch((s<<1)+w),w)
  obj = @DataEle.r_mem(mod,rm,w)
  unless @disass
    v = w + 1
    mask = 1 << (v * 8)
    od, sd = obj.data, (-src.data - self.CF) % mask
    sum = od + sd
    self.ZF = (sum % mask).zero?
    # TODO: AF unsure
    self.AF = (od % 0x10 + sd % 0x10) / 0x10
    # TODO: CF unsure
    self.CF = (sum / mask > 0).!
    self.SF = sum & (1 << (v * 8 - 1))
    self.PF = (0..(v*2-1)).map { |e| ((1 << e) & sum).zero?.!.to_i }.sum % 2 + 1
    self.OF = ((od & (1 << (v * 8 - 1))) == sd & (1 << (v * 8 - 1))) ? ((od & (1 << (v * 8 - 1))) != sum & (1 << (v * 8 - 1))) : false
    obj.data = sum % mask
  end
  ["SBB","#{obj[:sign]}, #{src[:sign]}"]
end
instruction_define "0000 111w" do |w|
  # Immediate to Accumulator
  # TODO: unknown operation need to ensure
  src = @DataEle.imm(fetch(+w),w)
  obj = @DataEle.r_mem(0,w)
  unless @disass
    v = w + 1
    mask = 1 << (v * 8)
    od, sd = obj.data, (-src.data - self.CF) % mask
    sum = od + sd
    self.ZF = (sum % mask).zero?
    # TODO: AF unsure
    self.AF = (od % 0x10 + sd % 0x10) / 0x10
    # TODO: CF unsure
    self.CF = (sum / mask > 0).!
    self.SF = sum & (1 << (v * 8 - 1))
    self.PF = (0..(v*2-1)).map { |e| ((1 << e) & sum).zero?.!.to_i }.sum % 2 + 1
    self.OF = ((od & (1 << (v * 8 - 1))) == sd & (1 << (v * 8 - 1))) ? ((od & (1 << (v * 8 - 1))) != sum & (1 << (v * 8 - 1))) : false
    obj.data = sum % mask
  end
  ["SBB","#{obj[:sign]}, #{src[:sign]}"]
end

### DEC: Decrement
instruction_define "1111 111w {mod} 001 {rm}" do |w,mod,rm|
  # Register/Memory
  # TODO: unknown operation need to ensure
  obj = @DataEle.r_mem(mod,rm,w)
  unless @disass
    v = 2
    mask = 1 << (v * 8)
    od, sd = obj.data, (-1) % mask
    sum = od + sd
    self.ZF = (sum % mask).zero?
    # TODO: AF unsure
    self.AF = (od % 0x10 + sd % 0x10) / 0x10
    # TODO: CF unsure
    # self.CF = (sum / mask > 0).!
    self.SF = sum & (1 << (v * 8 - 1))
    self.PF = (0..(v*2-1)).map { |e| ((1 << e) & sum).zero?.!.to_i }.sum % 2 + 1
    self.OF = ((od & (1 << (v * 8 - 1))) == sd & (1 << (v * 8 - 1))) ? ((od & (1 << (v * 8 - 1))) != sum & (1 << (v * 8 - 1))) : false
    obj.data = sum % mask
  end
  ["DEC","#{obj[:sign]}"]
end
instruction_define "0100 1{reg}" do |reg|
  # Register
  # TODO: unknown operation need to ensure
  obj = @DataEle.reg(reg,1)
  unless @disass
    v = 2
    mask = 1 << (v * 8)
    od, sd = obj.data, (-1) % mask
    sum = od + sd
    self.ZF = (sum % mask).zero?
    # TODO: AF unsure
    self.AF = (od % 0x10 + sd % 0x10) / 0x10
    # TODO: CF unsure
    # self.CF = (sum / mask > 0).!
    self.SF = sum & (1 << (v * 8 - 1))
    self.PF = (0..(v*2-1)).map { |e| ((1 << e) & sum).zero?.!.to_i }.sum % 2 + 1
    self.OF = ((od & (1 << (v * 8 - 1))) == sd & (1 << (v * 8 - 1))) ? ((od & (1 << (v * 8 - 1))) != sum & (1 << (v * 8 - 1))) : false
    obj.data = sum % mask
  end
  ["DEC","#{obj[:sign]}"]
end

### NEG: Change sign
instruction_define "1111 011w {mod} 011 {rm}" do |w,mod,rm|
  obj = @DataEle.r_mem(mod,rm,w)
  unless @disass
    v = w + 1
    mask = 1 << (v * 8)
    od, sd = obj.data, (-src.data - self.CF) % mask
    sum = od + sd
    self.ZF = (sum % mask).zero?
    # TODO: AF unsure
    self.AF = (od % 0x10 + sd % 0x10) / 0x10
    # TODO: CF unsure
    self.CF = (sum / mask > 0).!
    self.SF = sum & (1 << (v * 8 - 1))
    self.PF = (0..(v*2-1)).map { |e| ((1 << e) & sum).zero?.!.to_i }.sum % 2 + 1
    self.OF = ((od & (1 << (v * 8 - 1))) == sd & (1 << (v * 8 - 1))) ? ((od & (1 << (v * 8 - 1))) != sum & (1 << (v * 8 - 1))) : false
    obj.data = obj.data ^ ((1 << (w+1) * 8) - 1) + 1 if self.CF == 1
  end
  ["NEG",obj.sign]
end

### CMP: Compare
instruction_define "0011 10dw {mod} {reg} {rm}" do |d,w,mod,reg,rm|
  # Reg/Memory with Register to Either
  # TODO: unknown operation need to ensure
  src = @DataEle.reg(reg,w)
  obj = @DataEle.r_mem(mod,rm,w)
  obj, src = src, obj if d == 1
  unless @disass
    v = w + 1
    mask = 1 << (v * 8)

    od, sd = obj.data, (-src.data) % mask
    sum = od + sd
    self.ZF = (sum % mask).zero?
    # TODO: AF unsure
    self.AF = (od % 0x10 + sd % 0x10) / 0x10
    # TODO: CF unsure
    self.CF = (obj.data > src.data).!
    self.SF = sum & (1 << (v * 8 - 1))
    self.PF = (0..(v*2-1)).map { |e| ((1 << e) & sum).zero?.!.to_i }.sum % 2 + 1
    self.OF = ((od & (1 << (v * 8 - 1))) == sd & (1 << (v * 8 - 1))) ? ((od & (1 << (v * 8 - 1))) != sum & (1 << (v * 8 - 1))) : false
    # obj.data = sum % mask
  end
  ["CMP","#{obj[:sign]}, #{src[:sign]}"]
end
instruction_define "1000 00sw {mod} 111 {rm}" do |s,w,mod,rm|
  # Immediate to Register/Memory
  # TODO: unknown operation need to ensure
  c = fetch((s<<1)+w)
  c = c + (c << 8) if ((s<<1)+w) == 3
  src = @DataEle.imm(c,w)
  obj = @DataEle.r_mem(mod,rm,w)
  unless @disass
    v = w + 1
    mask = 1 << (v * 8)

    od, sd = obj.data, (-src.data) % mask
    sum = od + sd
    self.ZF = (sum % mask).zero?
    # TODO: AF unsure
    self.AF = (od % 0x10 + sd % 0x10) / 0x10
    # TODO: CF unsure
    self.CF = (sum / mask > 0).!
    self.SF = sum & (1 << (v * 8 - 1))
    self.PF = (0..(v*2-1)).map { |e| ((1 << e) & sum).zero?.!.to_i }.sum % 2 + 1
    self.OF = ((od & (1 << (v * 8 - 1))) == sd & (1 << (v * 8 - 1))) ? ((od & (1 << (v * 8 - 1))) != sum & (1 << (v * 8 - 1))) : false
    # obj.data = sum % mask
  end
  ["CMP","#{obj[:sign]}, #{src[:sign]}"]
end
instruction_define "0011 110w" do |w|
  # Immediate to Accumulator
  # TODO: unknown operation need to ensure
  src = @DataEle.imm(fetch(+w),w)
  obj = @DataEle.reg(0,w)
  unless @disass
    v = w + 1
    mask = 1 << (v * 8)

    od, sd = obj.data, (-src.data) % mask
    sum = od + sd
    self.ZF = (sum % mask).zero?
    # TODO: AF unsure
    self.AF = (od % 0x10 + sd % 0x10) / 0x10
    # TODO: CF unsure
    self.CF = (sum / mask > 0).!
    self.SF = sum & (1 << (v * 8 - 1))
    self.PF = (0..(v*2-1)).map { |e| ((1 << e) & sum).zero?.!.to_i }.sum % 2 + 1
    self.OF = ((od & (1 << (v * 8 - 1))) == sd & (1 << (v * 8 - 1))) ? ((od & (1 << (v * 8 - 1))) != sum & (1 << (v * 8 - 1))) : false
    # obj.data = sum % mask
  end
  ["CMP","#{obj[:sign]}, #{src[:sign]}"]
end

## LOGIC
# TODO: no function but dis Assemble

### NOT: Invert
instruction_define "1111 011w {mod} 010 {rm}" do |w,mod,rm|
  mask = (1<<((w+1)*8)) - 1
  obj = @DataEle.r_mem(mod,rm,w)
  unless @disass
    ans = obj.data = obj.data ^ mask
    self.CF, self.OF = 0, 0
    v = w + 1
    mask = 1 << (v * 8)
    self.ZF = (ans % mask).zero?
    self.SF = ans & (1 << (v * 8 - 1))
    self.PF = (0..(v*2-1)).map { |e| ((1 << e) & ans).zero?.!.to_i }.sum % 2 + 1
  end
  ["NOT", obj.sign]
end

### AND: And
instruction_define "0010 00dw {mod} {reg} {rm}" do |d,w,mod,reg,rm|
  # Reg./Memory and Register to Either
  src = @DataEle.reg(reg,w)
  obj = @DataEle.r_mem(mod,rm,w)
  obj, src = src, obj if d == 1 # TODO: unsure about d
  unless @disass
    ans = obj.data = obj.data & src.data
    self.CF, self.OF = 0, 0
    v = w + 1
    mask = 1 << (v * 8)
    self.ZF = (ans % mask).zero?
    self.SF = ans & (1 << (v * 8 - 1))
    self.PF = (0..(v*2-1)).map { |e| ((1 << e) & ans).zero?.!.to_i }.sum % 2 + 1
  end
  ["AND",obj.sign + ", " + src.sign]
end
instruction_define "1000 00sw {mod} 100 {rm}" do |s,w,mod,rm|
  # Reg./Memory and Register to Either
  obj = @DataEle.r_mem(mod,rm,w)
  src = @DataEle.imm(fetch((s<<1)+w),w)
  unless @disass
    ans = obj.data = obj.data & src.data
    self.CF, self.OF = 0, 0
    v = w + 1
    mask = 1 << (v * 8)
    self.ZF = (ans % mask).zero?
    self.SF = ans & (1 << (v * 8 - 1))
    self.PF = (0..(v*2-1)).map { |e| ((1 << e) & ans).zero?.!.to_i }.sum % 2 + 1
  end
  ["AND",obj.sign + ", " + src.sign]
end
instruction_define "0010 010w" do |w|
  # Reg./Memory and Register to Either
  obj = @DataEle.reg(0,w)
  src = @DataEle.imm(fetch(w))
  unless @disass
    ans = obj.data = obj.data & src.data
    self.CF, self.OF = 0, 0
    v = w + 1
    mask = 1 << (v * 8)
    self.ZF = (ans % mask).zero?
    self.SF = ans & (1 << (v * 8 - 1))
    self.PF = (0..(v*2-1)).map { |e| ((1 << e) & ans).zero?.!.to_i }.sum % 2 + 1
  end
  ["AND",obj.sign + ", " + src.sign]
end

### OR: Or
instruction_define "0000 10dw {mod} {reg} {rm}" do |d,w,mod,reg,rm|
  # Reg./Memory and Register to Either
  src = @DataEle.reg(reg,w)
  obj = @DataEle.r_mem(mod,rm,w)
  obj, src = src, obj if d == 1 # TODO: unsure about d
  unless @disass
    ans = obj.data = obj.data | src.data
    self.CF, self.OF = 0, 0
    v = w + 1
    mask = 1 << (v * 8)
    self.ZF = (ans % mask).zero?
    self.SF = ans & (1 << (v * 8 - 1))
    self.PF = (0..(v*2-1)).map { |e| ((1 << e) & ans).zero?.!.to_i }.sum % 2 + 1
  end
  ["OR",obj.sign + ", " + src.sign]
end
instruction_define "1000 00sw {mod} 001 {rm}" do |s,w,mod,rm|
  # Reg./Memory and Register to Either
  obj = @DataEle.r_mem(mod,rm,w)
  src = @DataEle.imm(fetch((s<<1)+w),w)
  unless @disass
    ans = obj.data = obj.data | src.data
    self.CF, self.OF = 0, 0
    v = w + 1
    mask = 1 << (v * 8)
    self.ZF = (ans % mask).zero?
    self.SF = ans & (1 << (v * 8 - 1))
    self.PF = (0..(v*2-1)).map { |e| ((1 << e) & ans).zero?.!.to_i }.sum % 2 + 1
  end
  ["OR",obj.sign + ", " + src.sign]
end
instruction_define "0000 110w" do |w|
  # Reg./Memory and Register to Either
  obj = @DataEle.reg(0,w)
  src = @DataEle.imm(fetch(w))
  unless @disass
    ans = obj.data = obj.data | src.data
    self.CF, self.OF = 0, 0
    v = w + 1
    mask = 1 << (v * 8)
    self.ZF = (ans % mask).zero?
    self.SF = ans & (1 << (v * 8 - 1))
    self.PF = (0..(v*2-1)).map { |e| ((1 << e) & ans).zero?.!.to_i }.sum % 2 + 1
  end
  ["OR",obj.sign + ", " + src.sign]
end

### XOR: Exclusive or
instruction_define "0011 00dw {mod} {reg} {rm}" do |d,w,mod,reg,rm|
  # Reg./Memory and Register to Either
  src = @DataEle.reg(reg,w)
  obj = @DataEle.r_mem(mod,rm,w)
  obj, src = src, obj if d == 1 # TODO: unsure about d
  unless @disass
    ans = obj.data = obj.data ^ src.data
    self.CF, self.OF = 0, 0
    v = w + 1
    mask = 1 << (v * 8)
    self.ZF = (ans % mask).zero?
    self.SF = ans & (1 << (v * 8 - 1))
    self.PF = (0..(v*2-1)).map { |e| ((1 << e) & ans).zero?.!.to_i }.sum % 2 + 1
  end
  ["XOR",obj.sign + ", " + src.sign]
end
instruction_define "1000 00sw {mod} 110 {rm}" do |s,w,mod,rm|
  # Reg./Memory and Register to Either
  obj = @DataEle.r_mem(mod,rm,w)
  src = @DataEle.imm(fetch((s<<1)+w),w)
  unless @disass
    ans = obj.data = obj.data ^ src.data
    self.CF, self.OF = 0, 0
    v = w + 1
    mask = 1 << (v * 8)
    self.ZF = (ans % mask).zero?
    self.SF = ans & (1 << (v * 8 - 1))
    self.PF = (0..(v*2-1)).map { |e| ((1 << e) & ans).zero?.!.to_i }.sum % 2 + 1
  end
  ["XOR",obj.sign + ", " + src.sign]
end
instruction_define "0011 010w" do |w|
  # Reg./Memory and Register to Either
  obj = @DataEle.reg(0,w)
  src = @DataEle.imm(fetch(w))
  unless @disass
    ans = obj.data = obj.data ^ src.data
    self.CF, self.OF = 0, 0
    v = w + 1
    mask = 1 << (v * 8)
    self.ZF = (ans % mask).zero?
    self.SF = ans & (1 << (v * 8 - 1))
    self.PF = (0..(v*2-1)).map { |e| ((1 << e) & ans).zero?.!.to_i }.sum % 2 + 1
  end
  ["XOR",obj.sign + ", " + src.sign]
end

## CONTROL TRANSFER
# TODO: no function but dis Assemble

### CALL: Call
instruction_define "1110 1000" do
  # Direct within Segment
  disp = fetchw
  push @DataEle.reg("PC") unless @disass
  @PC = @PC + disp.withsign(1) unless @disass
  ["CALL", "0x%04x" % disp]
end
instruction_define "1111 1111 {mod} 010 {rm}" do |mod,rm|
  # Indirect within Segment
  func = @DataEle.r_mem(mod,rm,1)
  push @DataEle.reg("PC") unless @disass
  @PC = func.data unless @disass
  ["CALL", func.sign]
end
instruction_define "1001 1010" do
  # Direct Intersegment
  new_pc = fetchw
  new_cs = fetchw
  push @DataEle.reg("CS") unless @disass
  push @DataEle.reg("PC") unless @disass
  @PC, @CS = new_pc, new_cs unless @disass
  ["CALL","FAR 0x%04x 0x%04x" % [new_pc, new_cs]]
end
instruction_define "1111 1111 {mod} 011 {rm}" do |mod,rm|
  # Indirect Intersegment
  func_pc = @DataEle.r_mem(mod,rm,1)
  func_cs = func_pc.next
  push @DataEle.reg("CS") unless @disass
  push @DataEle.reg("PC") unless @disass
  @PC, @CS = func_pc.data, func_cs.data unless @disass
  ["CALL", "FAR #{func_pc.sign} #{func_cs.sign}"]
end

### JMP: Unconditional Jump
instruction_define "1110 10n1" do |n|
  # Direct within Segment
  disp = (n == 0) ? fetchw : fetchb
  @PC = @PC + disp.withsign(1-n) unless @disass
  ["JMP", "0x%0#{(2-n)*2}x" % disp]
end
instruction_define "1111 1111 {mod} 100 {rm}" do |mod,rm|
  # Indirect within Segment
  func = @DataEle.r_mem(mod,rm,1)
  @PC = func.data unless @disass
  ["JMP", func.sign]
end
instruction_define "1110 1010" do
  new_pc = fetchw
  new_cs = fetchw
  @PC, @CS = new_pc, new_cs unless @disass
  ["JMP","FAR 0x%04x 0x%04x" % [new_pc, new_cs]]
end
instruction_define "1111 1111 {mod} 101 {rm}" do |mod,rm|
  # Indirect Intersegment
  func_pc = @DataEle.r_mem(mod,rm,1)
  func_cs = func_pc.next
  @PC, @CS = func_pc.data, func_cs.data unless @disass
  ["JMP", "FAR #{func_pc.sign} #{func_cs.sign}"]
end

### RET: Return from CALL
instruction_define "1100 0011" do
  # Within Segment
  pop @DataEle.reg("PC") unless @disass
  ["RET"]
end
instruction_define "1100 1011" do
  # Intersegment
  pop @DataEle.reg("PC") unless @disass
  pop @DataEle.reg("CS") unless @disass
  ["RET"]
end

### JE/JZ JNE/JNZ
instruction_define "0111 010n" do |n|
  disp = fetchb
  (@PC = @PC + disp.withsign if self.ZF == 1-n) unless @disass
  ["J#{n == 1 ? "N" : ""}Z", "0x%02x" % disp]
end
### JB/JNAE JBE/JNA
instruction_define "0111 0n10" do |n|
  disp = fetchb
  (@PC = @PC + disp.withsign if n==1 ? !!(self.CF || self.ZF) : !!self.CF) unless @disass
  ["JB#{(n == 1) ? "E" : ""}", "0x%02x" % disp]
end
### JS/JNS
instruction_define "0111 100n" do |n|
  disp = fetchb
  (@PC = @PC + disp.withsign if self.SF == (1-n)) unless @disass
  ["JNS", "0x%02x" % disp]
end
### JNB/JAE JNBE/JA
instruction_define "0111 0n11" do |n|
  # JNB/JAE: Jump on Not Below/Above or Equal
  # JNBE/JA: Jump on Not Below or Equal/Above
  disp = fetchb
  (@PC = @PC + disp.withsign if !(n==1 ? !!(self.CF || self.ZF) : !!self.CF)) unless @disass
  ["JNB#{(n == 1) ? "E" : ""}", "0x%02x" % disp]
end

## PROCESSOR CONTROL

### STC: Set Carry
instruction_define "1111 1001" do
  self.CF = 1 unless @disass
  ["STC"]
end
### HLT: Halt
instruction_define "1111 0100" do
  self.halt unless @disass
  ["HLT"]
end

ins_set = @ins_set
InstructionSet = Module.new do
  class_variable_set(:@@instruction_set, ins_set)
end
