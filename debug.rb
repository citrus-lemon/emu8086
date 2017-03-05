# Extended for CPU Core to debug operation

module Debug
  def initialize
    super
    @breakpointlist, @breaktimeslist = [], []
    @onhalt = Proc.new {}
    @current_times = 0
  end

  # clear the status
  def clear
    @AX, @BX, @CX, @DX = 0, 0, 0, 0
    @SI, @DI, @BP, @SP = 0, 0, 0, 0x400
    @first_SP = 0x400
    @stack_operation = nil
    @PC = 0
    @CS, @DS, @ES, @SS = 0x800, 0, 0, 0x400
    @FLAG = 0
    @memory = []
    @disass = false
    @current_times = 0
    @oninit.call(self) if @oninit
  end

  def onhalt(&block)
    @onhalt = block
  end

  def onstep(&block)
    @onstep = block
  end

  # Breakpoint operation

  def breakpoint(*points)
    @breakpointlist = [] unless @breakpointlist
    @breakpointlist += points
    @breakpointlist
  end
  def breakpoint=(plist)
    @breakpointlist = plist
  end

  def break_at_times(*breaks)
    @breaktimeslist = [] unless @breaktimeslist
    @breaktimeslist += breaks
    @breaktimeslist
  end
  def break_at_times=(breaks)
    @breaktimeslist = breaks
  end

  # Debug Operation

  def debug
    @runstatus = true
    while @runstatus
      begin
        step
        @onstep.call(self) if @onstep
        break if @breakpointlist.include? @PC
        break if @breaktimeslist.include? @current_times
      rescue Exception
        break
      end
      @current_times += 1
    end
  end

  def run
    @runstatus = true
    while @runstatus
      begin
        step
        @onstep.call(self) if @onstep
      rescue Exception
        break
      end
      @current_times += 1
    end
  end

  def step_into

  end

  def step_over

  end

  def step_out

  end

end

class CPU
  prepend Debug
end
