@AssemblerCodeSet = []
def AsCodeSet(code,&block)
  @AssemblerCodeSet << {
    :sign => code,
    :method => block
  }
end

AsCodeSet "MOV" do |code|
  code.parameter =~ /^(?:\s*(word|byte)\s+)*(.*?)$/i
  w = case $1.to_s.upcase
    when "WORD" then 1
    when "BYTE" then 0
  end
  obj, src = $2.split(',',2).map {|el| @Element.new(el,w)}
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

  code.annotate = {
    :command => "MOV",
    :args => [
      obj,
      src
    ]
  }

  code.bytes = 1
  
  # code.ready do
  #   obj.ready && src.ready
  # end
  # code.compile do
  #   [65]
  # end

  error "cannot assign to immediate data" if obj.immediate?
  case
    when obj.register? && src.register?
      code.bytes = 2
      code.ready {nil}
      mod, rm = src.rm_mod
      reg = obj.code
      code.compile {[0x88+w,(mod << 6) + (reg << 3) + rm]}
    when src.immediate?

  end

end

as_set = @AssemblerCodeSet
AssemblerCodeSet = Module.new do
  class_variable_set(:@@code_set, as_set)
end