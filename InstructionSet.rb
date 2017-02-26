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
  puts self
  case d
  when 0
    src = @DataEle.reg(reg,w)
    obj = @DataEle.r_mem(mod,rm,w)
  when 1
    obj = @DataEle.reg(reg,w)
    src = @DataEle.r_mem(mod,rm,w)
  end
  obj.data = src.data unless @disass
  ["MOV","#{obj[:sign]}, #{src[:sign]}"]
end

instruction_define "1100 011w {mod} 000 {rm}" do |w,mod,rm|
  obj = @DataEle.r_mem(mod,rm,w)
  src = @DataEle.imm(fetch(w))
  obj.data = src.data unless @disass
  ["MOV","#{obj[:sign]}, #{src[:sign]}"]
end

instruction_define "1011 w{reg}" do |w,reg|
  puts self
  obj = @DataEle.reg(reg,w)
  src = @DataEle.imm(fetch(w))
  obj.data = src.data unless @disass
  ["MOV","#{obj[:sign]}, #{src[:sign]}"]
end

instruction_define "1010 00dw" do |d,w|
  obj = @DataEle.reg("AX")
  src = @DataEle.mem(fetchw)
  temp = obj; obj = src; src = temp if d == 1
  obj.data = src.data unless @disass
  ["MOV","#{obj[:sign]}, #{src[:sign]}"]
end

instruction_define "1000 11d0 {mod} 0 {seg} {rm}" do |d,mod,seg,rm|
  obj = @DataEle.r_mem(mod,rm,1)
  src = @DataEle.seg(seg)
  temp = obj; obj = src; src = temp if d == 1
  obj.data = src.data unless @disass
  ["MOV","#{obj[:sign]}, #{src[:sign]}"]
end

ins_set = @ins_set
InstructionSet = Module.new do
  class_variable_set(:@@instruction_set, ins_set)
end
