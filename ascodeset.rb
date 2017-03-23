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
    else nil
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

  code.bytes = 0
  code.annotate = {
    :command => "MOV",
    :args => [
      obj,
      src
    ]
  }
  code.ready do
    obj.ready && src.ready
  end
  code.compile do

  end
end

as_set = @AssemblerCodeSet
AssemblerCodeSet = Module.new do
  class_variable_set(:@@code_set, as_set)
end