# Extended for CPU Core to debug operation

module Debug
  def initialize
    super
    @breakpointlist, @breaktimeslist = [], []
    @onhalt = Proc.new {}
    @onstep = Proc.new {}
    @current_times = 0
    @runstatus = nil
    @calllevel = 0
  end

  attr_reader :calllevel, :current_times

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
    @calllevel = 0
    @oninit.call(self) if @oninit
  end

  def step
    ans = super
    unless @disass
      @current_times += 1
      case ans[1]
      when "CALL" then @calllevel += 1
      when "RET"  then @calllevel -= 1
      end
    end
    ans
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
        s = step
        @onstep.call(self,s) if @onstep
        break if @breakpointlist.include? @PC
        break if @breaktimeslist.include? @current_times
      rescue Exception
        break
      end
    end
  end

  def run
    @runstatus = true
    while @runstatus
      begin
        s = step
        @onstep.call(self,s) if @onstep
      rescue Exception
        break
      end
    end
  end

  def step_into
    step
    @onstep.call(self) if @onstep
  end

  def step_over
    depth = @calllevel
    @runstatus = true
    while @runstatus
      begin
        step
        break unless @calllevel > depth
      rescue Exception
        break
      end
    end
    @onstep.call(self) if @onstep
  end

  def step_out
    if @calllevel > 0
      depth = @calllevel
      while @calllevel
        begin
          step
          break unless @calllevel > depth - 1
        rescue Exception
          break
        end
      end
    else
      step
    end
    @onstep.call(self) if @onstep
  end

end

class CPU
  prepend Debug
end
