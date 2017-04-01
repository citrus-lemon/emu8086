import React, { Component } from 'react';
import './Component.css'

const padz = (number, length) => {
  let my_string = number.toString(16);
  while (my_string.length < length) {
      my_string = '0' + my_string;
  }
  return my_string;
}

class Register extends Component {
  render() {
    let elements = []
    elements.push(...["AX","BX","CX","DX"].map((el) => {
      let str = padz(this.props.cpu.register(el),4)
      return (
        <div className="reg-block" data-reg={el}>
          <span className="reg-label">{el}</span>
          <span data-byte={el[0]+'H'}>{str.substr(0,2)}</span><span data-byte={el[0]+'L'}>{str.substr(2,2)}</span>
        </div>
      )
    }))
    elements.push(...[
      "SI","DI","BP","SP",
      "CS","DS","SS","ES","PC"
    ].map((el) => {
      return (
        <div className="reg-block" data-reg={el}>
          <span className="reg-label">{el}</span>
          <span>{padz(this.props.cpu.register(el),4)}</span>
        </div>
      )
    }))
    let flag = this.props.cpu.flag()
    let flageles = Object.keys(flag).map((el) => {
      return (
        <span className={"flag " + (flag[el] ? "true" : "false")}><span>{el}</span></span>
      )
    }).reverse()
    elements.push(
      <div className="reg-block" data-reg="FLAG">
        <span className="reg-label">FLAG</span>
        <span>{flageles}</span>
      </div>
    )
    let style = this.props.frame
    return (
      <div className="register-space" style={style}>
        <div className="register-frame">{elements}</div>
      </div>
    )
  }
}

class Memory extends Component {
  render() {
    let style = this.props.frame
    return (
      <div className="memory-space" style={style}>
        <div>
          <div className="memory-label"></div>
          <div className="memory-table"></div>
        </div>
      </div>
    );
  }
}

export { Register, Memory }
