import React, { Component } from 'react';
import './Title.css'

class Title extends Component {
  render() {
    return (
      <div className="title">
        <a href=".">
          <img src="symbol.png" alt="emu8086" style={{height: '50px', width: '100px', position: 'absolute', top: '3px', marginLeft: '20px'}}/>
        </a>
        <a href="https://github.com/windprophet/emu8086" style={{float: 'right', position: 'absolute',right: '20px'}}>
          <span style={{lineHeight: '50px', color: 'white', textDecoration: 'none'}}>Source Code on Github</span>
        </a>
      </div>
    )
  }
}

export {Title};
