# Extended for CPU Core to debug operation

class CPU

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
    @breaklinelist = [] unless @breaklinelist
    @breaklinelist += breaks
    @breaklinelist
  end
  def break_at_times(breaks)
    @breaklinelist = breaks
  end

  # Debug Operation

  def debug

  end

  def run

  end

  def step_into

  end

  def step_over

  end

  def step_out

  end

end
