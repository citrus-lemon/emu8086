import React, { Component } from 'react';
import './Control.css'

class Debug extends Component {
  render() {
    return (
      <div className="debug-space" style={this.props.frame}>
        <input type="file" ref={(el) => {
          const loadFile = () => {
            if (typeof window.FileReader !== 'function') {
              console.error("The file API isn't supported on this browser yet.")
            }
            let input = el
            let file = input.files[0];
            let fr = new FileReader();
          }
        }}/>
      </div>
    )
  }
}

export { Debug }
