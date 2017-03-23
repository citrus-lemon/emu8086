module AssemblerClasses

  class Element
    def initialize(*args)
      case args.map(&:class)
      when [String]
      when [String, Integer]

      end
    end

    def bind(obj)
      @self = obj
      [:error, :warning, :fatal].each do |fn|
        define_method fn { |*args| @self.method(fn).call(*args) }
      end
      define_method :code { @self.instance_variable_get(:@code) }
    end

    # description
    def to_s

    end
    
  end

  class SingletonCode
    def initialize(code,opts,label,comment)
      @code = code.upcase
      @parameter = opts
      @label = label
      @comment = comment
      @annotate = {

      }
    end

    # For instruction defining

    attr_accessor :bytes
    attr_reader :parameter

    def annotate=(opt)
      @annotate = @annotate.merge(opt)
    end

    # check the status if it is ready to compile
    def ready(&block)
      # return `nil' if ready
      @ready = block
    end

    # load compile to binary func
    def compile(&block)
      @compile = block
    end

    # compile code

    def getready
      unless @ready.call
        @compile.call
      else
        false
      end
    end
    
    def getready!
      unless m = @ready.call
        @compile.call
      else
        throw m
      end
    end

    # apply

    def apply(code_set, me)
      code_set.each do |code|
        if (
          (
            (code[:sign].class == String) && 
            (code[:sign] == @code)
          ) || 
          (
            (code[:sign].class == Regexp) && 
            (code[:sign] =~ @code)
          )
        )
          me.instance_exec(self, &code_set[:method])
          break
        end
      end
    end

    # description
    def to_s

    end
    
  end

  def initialize(*args)
    super(*args)
    me = self
    @Element = Class.new(Element) do
      @@self = me
      def initialize(*args)
        super(*args)
        bind(@@self)
      end
    end
  end

end