import React, { Component } from 'react';
import './Control.css'
const octicons = require("octicons")
const padz = (number, length) => {
  let my_string = number.toString(16);
  while (my_string.length < length) {
      my_string = '0' + my_string;
  }
  return my_string;
}

function FileButton(props) {
  let input
  let label
  return (
    <span className="control-button" ref={(el) => {el && (el.onclick = () => {input && input.click()})}}>
      <span className="control-icon" ref={(el) => {el && (el.innerHTML = octicons['file-code'].toSVG({height: 20}))}}></span>
      <input type="file" className="control-input" ref={(el) => {el && (input = el)}} onChange={(el) => {
        let file = input.files[0];
        if (file) {
          label.innerText = file.name;
          let fr = new FileReader();
          fr.onload = () => {
            let codearray = [...fr.result].map((s) => s.charCodeAt())
            props.refresh({
              code: {
                name: file.name,
                code: codearray
              }
            })
          }
          fr.readAsBinaryString(file);
        }
        else {
          label.innerText = "Load Code"
        }
      }}/>
      <span ref={(el) => {el && (label = el)}}>Load Code</span>
    </span>
  )
}

class Debug extends Component {
  render() {
    this.props.cpu.onevent('debugstep',(s,c) => {
      let update
      if (c.command) {
        if (!c.hasOwnProperty("intersection")) {
          if (c.args && Array.isArray(c.args)) {
            update = c.args.map((el) => {
              if (el.class == "mem") {
                return el.addr
              }
              else if (el.class == "reg" || el.class == "seg") {
                return el.sign
              }
            })
          }
        }
      }
      this.props.refresh({update: update})
    })
    let content = (
      <div>
        <FileButton refresh={this.props.refresh}></FileButton>
        <button onClick={() => {this.props.cpu.stepInto()}}>step</button>
        <button onClick={() => {this.props.cpu.stepOver()}}>stepover</button>
        <button onClick={() => {this.props.cpu.stepOut()}}>stepout</button>
        <button onClick={() => {this.props.cpu.event('init')();this.props.refresh()}}>init</button>
      </div>
    )
    return (
      <div className="debug-space" style={this.props.frame}>
        {content}
      </div>
    )
  }
}

class Codelist extends Component {
  render() {
    let content
    let offsetlist = []
    if (this.props.cpu.codeparse) {
      content = this.props.cpu.codeparse.map((code,i) => (
        <div className="code-line" key={i}>
          {(offsetlist.push(code.addr) ,'')}
          <span style={{width: '10px', minWidth: 0}}>{(code.addr == this.props.cpu.register("PC")) ? ">" : ""}</span>
          <span>{padz(code.addr,4)}</span>
          <span>{code.command}</span>
          <span>
          {(() => {
            if (code.command == "INT") {
              return code.args
            }
            return code.hasOwnProperty("intersection") ? (
              code.args ? code.args.map((el,i) => (<span className="args" key={i}>{(typeof(el) === 'number') ? padz(code.endwith + el,4) : void(0)}</span>)) : void(0)
            ) : (
              code.args ? code.args.map((el,i) => (<span className="args" key={i}>{el.toString()}</span>)) : void(0)
            )
          })()}
          </span>

        </div>
      ))
    }
    let style = this.props.frame
    style.overflowY = 'scroll'
    return (
      <div className="codelist-space" style={style} ref={(el) => {
        el && (this.space = el);
        if (this.space) {
          let height = this.space.childNodes[0] ? this.space.childNodes[0].offsetHeight : 0
          this.space.scrollTop = offsetlist.indexOf(this.props.cpu.register("PC")) * height - 3*height
        }
        }}>
        {content}
      </div>
    )
  }
}

class Screen extends Component {
  render() {
    return (
      <div style={this.props.frame}>
        <pre className="screen">{this.props.content}</pre>
      </div>
    )
  }
}

export { Debug, Codelist, Screen }
