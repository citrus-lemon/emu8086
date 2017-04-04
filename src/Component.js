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
        <div className="reg-block" data-reg={el} key={el}>
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
        <div className="reg-block" data-reg={el} key={el}>
          <span className="reg-label">{el}</span>
          <span>{padz(this.props.cpu.register(el),4)}</span>
        </div>
      )
    }))
    let flag = this.props.cpu.flag()
    let flageles = Object.keys(flag).map((el) => {
      return (
        <span className={"flag " + (flag[el] ? "true" : "false")} key={el}><span>{el}</span></span>
      )
    }).reverse()
    elements.push(
      <div className="reg-block" data-reg="FLAG" key="FLAG">
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
    this.state = {point: 580}
    this.lineheight = 16
    top.hello = this
  }

  render() {
    let line = 170
    let minus = 70
    let style = this.props.frame
    if (this.state.point < 0) {
      this.state.point = 0
    }
    return (
      <div className="memory-space" style={style}>
        <div className="model-tag">Memory</div>
        <div className="model-frame">
          <div style={{top: '-20px', left: '-20px', right: '-20px', position: 'absolute', height: 35, boxShadow: '0 2px 4px 0 rgba(0,0,0,0.50)', zIndex: 1}} onClick={() => {
            this.searchinput && this.searchinput.focus()
            }}></div>
          <div style={{bottom: '-20px', left: '-20px', right: '-20px', position: 'absolute', height: 30, boxShadow: '0 -2px 4px 0 rgba(0,0,0,0.50)', zIndex: 1}}></div>
          <div style={{height: '20px', position: 'absolute', top: 0, left: '10px', right: '10px'}}>
            <div className="memory-label">
              <input type="text" style={{
                color: '#888',
                border: 'none',
                width: '100%',
                height: '100%',
                backgroundColor: 'rgba(0,0,0,0)',
                textAlign: 'center',
                top: '-6px',
                left: 0,
                position: 'absolute'
              }} onFocus={(e) => {
                this.searchinput.value = ''
              }} onBlur={(e) => {
                let num;
                try {
                  num = parseInt(this.searchinput.value, 16)
                } catch (error) {

                }
                this.searchinput.value = '';
                ((num+1) && !isNaN(num)) && this.setState({point: num});
              }} ref={(el) => {this.searchinput = el}}/>
            </div>
            <div className="memory-table" style={{'color': '#888'}}>
              {[...Array(16).keys()].map((e) => (<div className="memory-block-element" key={e.toString()}>{padz(e,2)}</div>))}
            </div>
          </div>
          <div style={{overflow: 'hidden', position: 'absolute', top: 20, left: 10, right: 10, bottom: 10, WebkitOverflowScrolling: 'touch'}} ref={(el) => {
            const line = (pos) => {
              let element = document.createElement("div")
              element.className = "memory-line"
              let label = document.createElement("div")
              label.className = "memory-label"
              let table = document.createElement("div")
              table.className = "memory-table"
              element.appendChild(label)
              element.appendChild(table)
              element.setAttribute("style",`top: ${pos*16}px`)
              label.innerText = padz(pos*16,4);
              element.setAttribute("data-postion",label.innerText);
              [...Array(16).keys()].forEach((e) => {
                let byte = document.createElement("div")
                byte.className = "memory-block-element"
                byte.innerText = padz(this.props.cpu.memory(pos*16+e,0),2)
                table.appendChild(byte)
              })
              return element
            }
            const line30 = (pos30) => {
              let element = document.createElement("div");
              element.setAttribute("data-range",`${pos30*30}-${pos30*30+29}`);
              [...Array(30).keys()].forEach((e) => {
                element.appendChild(line(pos30*30 + e))
              })
              return element
            }
            this.pos30 = parseInt(this.state.point/16/30)
            const height = 16
            let page = this.pageelement || document.createElement("div");
            this.pageelement || el.appendChild(page);
            this.pageelement = page
            this.slide = height*(parseInt(this.state.point / 16) - 4);
            (this.slide < 0) && (this.slide = 0);
            (this.pos30 < 0) && (this.pos30 = 0);
            const translate = (s) => {
              this.pageelement.style.transform = `translate3d(0px, -${s}px, 0px)`
            }
            translate(this.slide)
            // let this.upelement,this.midelement,this.downelement
            const first_render = (pos) => {
              while (this.pageelement.firstChild) {
                this.pageelement.removeChild(this.pageelement.firstChild);
              }
              let _p30 = parseInt(pos / 30)
              this.pos30 = _p30
              this.upelement = (_p30 - 1 >= 0) ? line30(_p30 - 1) : void(0)
              this.midelement = (_p30 >= 0) ? line30(_p30) : void(0)
              this.downelement = (_p30 + 1 >= 0) ? line30(_p30 + 1) : void(0)
              this.upelement && this.pageelement.appendChild(this.upelement)
              this.midelement && this.pageelement.appendChild(this.midelement)
              this.downelement && this.pageelement.appendChild(this.downelement)
            }
            first_render(parseInt(this.state.point / 16))
            const render = (pos) => {
              let _p30 = pos ? parseInt(pos / height / 30) : parseInt(this.slide / height / 30)
              if (_p30 == this.pos30) {

              }
              else if (_p30 == this.pos30 + 1) {
                this.upelement && this.pageelement.removeChild(this.upelement)
                this.upelement = this.midelement
                this.midelement = this.downelement
                this.downelement = (_p30 + 1 >= 0) ? line30(_p30 + 1) : void(0)
                this.downelement && this.pageelement.appendChild(this.downelement)
              }
              else if (_p30 == this.pos30 - 1) {
                this.downelement && this.pageelement.removeChild(this.downelement)
                this.downelement = this.midelement
                this.midelement = this.upelement
                this.upelement = (_p30 - 1 >= 0) ? line30(_p30 - 1) : void(0)
                this.upelement && this.pageelement.appendChild(this.upelement)
              }
              else {
                this.upelement && this.pageelement.removeChild(this.upelement)
                this.midelement && this.pageelement.removeChild(this.midelement)
                this.downelement && this.pageelement.removeChild(this.downelement)
                this.upelement = (_p30 - 1 >= 0) ? line30(_p30 - 1) : void(0)
                this.midelement = (_p30 >= 0) ? line30(_p30) : void(0)
                this.downelement = (_p30 + 1 >= 0) ? line30(_p30 + 1) : void(0)
                this.upelement && this.pageelement.appendChild(this.upelement)
                this.midelement && this.pageelement.appendChild(this.midelement)
                this.downelement && this.pageelement.appendChild(this.downelement)
              }
              this.pos30 = _p30
            }

            //events

            if (!this.pageel && el) {
              {/*el.removeEventListener("mousewheel")*/}
              el.addEventListener("mousewheel",(e) => {
                let t = (this.slide + e.deltaY) > 0 ? this.slide + e.deltaY : 0
                translate(t)
                this.slide = t
                render()
              })
              {/*el.removeEventListener("touchmove")*/}
              el.addEventListener("touchmove",(e) => {
                if (!this.movestart || isNaN(this.movestart)) {this.movestart = e.layerY}
                let t = (this.slide + this.movestart - e.layerY) > 0 ? this.slide + this.movestart - e.layerY : 0
                translate(t)
                render(t)
              })
              {/*el.removeEventListener("touchend")*/}
              el.addEventListener("touchend", (e) => {
                if (!this.movestart || isNaN(this.movestart)) {this.movestart = e.layerY}
                let t = (this.slide + this.movestart - e.layerY) > 0 ? this.slide + this.movestart - e.layerY : 0
                this.pageelement.style.transform = `translate3d(0px, -${t}px, 0px)`
                this.slide = t
                render()
                this.movestart = void(0)
              })
            }
            this.pageel = el
          }}>
          </div>
        </div>
      </div>
    );
  }
}

export { Register, Memory }
