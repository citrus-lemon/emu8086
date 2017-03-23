module AssemblerClasses

  class Element

    def bind(obj)
      @self = obj
      [:error, :warning, :fatal].each do |fn|
        define_method fn { |*args| @self.method(fn).call(*args) }
      end
    end
    
  end

  class SingletonCode
    def initialize
      
    end

    # For instruction defining

    attr_accessor :bytes
    attr_reader :parameter

    def annotate=(str)

    end

    # check the status if it is ready to compile
    def ready(&block)
      
    end

    # compile code to binary if ready
    def compile(&block)

    end

    # apply

    def apply(code_set, me)

    end
    
  end

end