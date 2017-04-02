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
        <div className="model-tag">Register</div>
        <div className="model-frame">
          {elements}
        </div>
      </div>
    )
  }
}

class Memory extends Component {
  constructor() {
    super()
    this.state = {start: 0}
    this.lineheight = 16
    this.position = 0
    top.hello = this
  }

  render() {
    let line = 170
    let minus = 70
    let style = this.props.frame
    if (this.state.start < 0) {
      this.state.start = 0
    }
    // console.log("memory: ",this.state.start)
    return (
      <div className="memory-space" style={style}>
        <div className="model-tag">Memory</div>
        <div className="model-frame">
          <div style={{top: '-20px', left: '-20px', right: '-20px', position: 'absolute', height: 35, boxShadow: '0 2px 4px 0 rgba(0,0,0,0.50)', zIndex: 1}}></div>
          <div style={{bottom: '-20px', left: '-20px', right: '-20px', position: 'absolute', height: 30, boxShadow: '0 -2px 4px 0 rgba(0,0,0,0.50)', zIndex: 1}}></div>
          <div style={{height: '20px', position: 'absolute', top: 0, left: '10px', right: '10px'}}>
            <div className="memory-label">
              <input type="text" style={{
                'color': '#888',
                'border': 'none',
                'width': '100%',
                'height': '100%',
                'background-color': 'rgba(0,0,0,0)',
                'text-align': 'center'
              }}/>
            </div>
            <div className="memory-table" style={{'color': '#888'}}>
              {[...Array(16).keys()].map((e) => (<div className="memory-block-element">{padz(e,2)}</div>))}
            </div>
          </div>
          <div style={{overflow: 'hidden', position: 'absolute', top: 20, left: 10, right: 10, bottom: 10}} ref={(el) => {
            if (!this.pageel && el) {
              el.addEventListener("DOMMouseScroll",(e) => {console.log(e)})
              el.addEventListener("mousewheel",(e) => {
                {/*console.log(e.deltaY)*/}
                let t = (this.position + e.deltaY) > 0 ? this.position + e.deltaY : 0
                this.memoryPageElement.style.transform = `translate3d(0px, -${t}px, 0px)`
                if (Math.abs(parseInt(t/16) - parseInt(this.state.start)) > 20 || (parseInt(t/16) < 5 && this.state.start != 0)) {
                  {/*console.log('hello',t/16)*/}
                  this.setState({start: parseInt(this.position / 16)})
                }
                this.position = t
              })
              el.addEventListener("touchmove",(e) => {
                if (!this.pos || isNaN(this.pos)) {this.pos = e.layerY}
                let t = (this.position + this.pos - e.layerY) > 0 ? this.position + this.pos - e.layerY : 0
                this.memoryPageElement.style.transform = `translate3d(0px, -${t}px, 0px)`
              })
              el.addEventListener("touchend", (e) => {
                if (!this.pos || isNaN(this.pos)) {this.pos = e.layerY}
                let t = (this.position + this.pos - e.layerY) > 0 ? this.position + this.pos - e.layerY : 0
                this.memoryPageElement.style.transform = `translate3d(0px, -${t}px, 0px)`
                if (Math.abs(parseInt(t/16) - parseInt(this.state.start)) > 20 || (parseInt(t/16) < 5 && this.state.start != 0)) {
                  console.log("touchend",e.layerY)
                  this.setState({start: parseInt(this.position / 16)})
                }
                this.position += this.pos - e.layerY
                this.pos = void(0)
              })
            }
            this.pageel = el
          }}>
            <div ref={(el) => {
                this.memoryPageElement = el
              }} style={{position: 'absolute', height: '100%', width: '100%'}}>
              <div className="memory-label" style={{color: '#888'}}>
                {[...Array(line).keys()].map((r) => (
                  (r >= minus) ?
                  <div className="memory-line" style={{
                    top: (r-minus+this.state.start)*16 + 'px'
                  }}>{padz((r-minus+this.state.start)*16,4)}</div> : void(0)
                ))}
              </div>
              <div className="memory-table">
                {[...Array(line).keys()].map((r) => (
                  (r >= minus) ?
                  <div className="memory-line" style={{
                    top: (r-minus+this.state.start)*16 + 'px'
                  }}>{[...Array(16).keys()].map((e) => (<div className="memory-block-element">
                    {padz(this.props.cpu.memory((r-minus+this.state.start)*16+e,0),2)}
                  </div>))}</div> : void(0)
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export { Register, Memory }
