module AsmIns
  @@instruction_set = []
  def self.pseudo(code,&block)

  end

  def self.incode(code,&block)

  end
end


AsmIns::incode "MOV" do |par|
  objstr, srcstr = par.split(',',2)
end
