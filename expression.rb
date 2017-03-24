#!/usr/bin/env ruby

module Expression
  
end

unless Array.method_defined?("sum")
  class Array
    def sum
      s = 0
      self.each {|e| s += e}
      s
    end
  end
end

def Expression::exp(e)
  list = e.scan(/(?:[\(\)+\-*\/]|\w+|\'(?:\\\'|.)\')/)
  throw 'expression error with {e}, check with brackets and avoid float number' unless e.gsub(/\s/,'') == list.join('').gsub(/\s/,'')
  op_stack = []
  nu_stack = []
  bl_stack = [0]
  list.each do |el|
    case
      when ['+','-','*','/'].index(el)
        op_stack << el
      when ['(',')'].index(el)
        case el
          when '('
            op_stack << '('
            bl_stack << nu_stack.length
          when ')'

            f_point = bl_stack.pop
            a_list = []
            while op_stack[-1] != '('
              op = op_stack.pop
              case op
                when '+'
                  a_list << nu_stack.pop if nu_stack.length > f_point
                when '-'
                  a_list << ['-',0,nu_stack.pop] if nu_stack.length > f_point
              end
            end
            a_list << nu_stack.pop if nu_stack.length > f_point
            case a_list.length
              when 0
                throw "no in bracket"
              when 1
                nu_stack.push a_list[0]
              else
                nu_stack.push(['+'] + a_list.reverse)
            end

            op_stack.pop
            if ['*','/'].index(op_stack[-1])
              op = op_stack.pop
              b, a = nu_stack.pop, nu_stack.pop
              nu_stack.push([op,a,b])
            end
        end
      when el =~ /^(0x\d[a-f0-9]*|\d[a-f0-9]*h)|(0b[0-1]+|[0-1]+b)|(\d+)|\'(\\\'|.)\'$/i
        value = $1.to_i(16) if $1
        value = $2.to_i(2)  if $2
        value = $3.to_i     if $3
        value = $4 == "\\'" ? "'".ord : $4.ord if $4
        nu_stack << value
        if ['*','/'].index(op_stack[-1])
          op = op_stack.pop
          b, a = nu_stack.pop, nu_stack.pop
          nu_stack.push([op,a,b])
        end
      when el =~ /^\w+$/
        value = el
        nu_stack << value
        if ['*','/'].index(op_stack[-1])
          op = op_stack.pop
          b, a = nu_stack.pop, nu_stack.pop
          nu_stack.push([op,a,b])
        end
    end
    # puts "op => #{op_stack}"
    # puts "nu => #{nu_stack}"
    # gets
  end
  f_point = bl_stack.pop
  a_list = []
  while op_stack[-1]
    op = op_stack.pop
    case op
      when '+'
        a_list << nu_stack.pop if nu_stack.length > f_point
      when '-'
        a_list << ['-',0,nu_stack.pop] if nu_stack.length > f_point
    end
  end
  a_list << nu_stack.pop if nu_stack.length > f_point
  case a_list.length
    when 0
      throw "no in content"
    when 1
      nu_stack.push a_list[0]
    else
      nu_stack.push(['+'] + a_list.reverse)
  end
  ans = nu_stack.pop
  if ans.class == Array && ans[0] == '+'
    def flat(x)
      if x.class == Array
        case x[0]
          when '+'
            x[1..-1].map{|ex| flat(ex)}.flatten(1)
          when '-'
            [x[1],['-',0,x[2]]]
          else
            [x]
        end
      else
        [x]
      end
    end
    ans = ['+'] + flat(ans)
  else
    ans
  end
end

def Expression::format?(e)
  list = e.scan(/(?:[\(\)+\-*\/]|\w+|\'(?:\\\'|.)\')/)
  e.gsub(/\s/,'') == list.join('').gsub(/\s/,'')
end

def Expression::vaild?(exp,table = nil)
  return true if exp.class == Integer
  table = {} unless table
  return !!table[exp] if exp.class == String
  paras = exp.flatten.select{|e| e.class == String && !['+','-','*','/'].index(e)}
  paras.each do |p|
    case table[p].class.to_s
      when "Integer"
      when "Array"
        # STDERR.puts ""
      when "String"
        return false unless table[table[p]]
      when "NilClass"
        return false
    end
  end
end

def Expression::vaild!(exp,table = nil)
  return true if exp.class == Integer
  table = {} unless table
  # TODO: vaild
end

def Expression::calc(exp,table = nil)
  return exp if exp.class == Integer
  table = {} unless table
  case exp.class.to_s
    when "Array"
      case exp[0]
        when '+'
          exp[1..-1].map{|e| Expression::calc(e,table)}.sum
        when '-'
          Expression::calc(exp[1],table) - Expression::calc(exp[2],table)
        when '*'
          Expression::calc(exp[1],table) * Expression::calc(exp[2],table)
        when '/'
          Expression::calc(exp[1],table) / Expression::calc(exp[2],table)
      end
    when "String"
      Expression::calc(table[exp],table)
    when "NilClass"
      0
    when "Integer"
      exp
    when "Float"
      throw "float not allow"
  end
end

if __FILE__ == $0
  require 'pry'
  pry
end
