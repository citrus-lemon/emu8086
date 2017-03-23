@AssemblerCodeSet = []
def AsCodeSet(code,&block)
  
end

AsCodeSet "MOV" do |code|

end

as_set = @AssemblerCodeSet
AssemblerCodeSet = Module.new do
  class_variable_set(:@@code_set, as_set)
end