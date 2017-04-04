import React, { Component } from 'react';
import './App.css';
import { Register, Memory } from './Component';
import { Debug, Codelist } from './Control';
import {Title} from './Title';
import {debug as core} from './concatenated.js';

class App extends Component {
  constructor(props) {
    super(props)
    this.core = new core()

  }

  componentWillMount() {
    let onresize = () => {
      this.setState({
        frame: {
          width: window.innerWidth,
          height: window.innerHeight,
        }
      })
    }
    onresize()
    window.addEventListener("resize", onresize)
  }

  render() {
    return (
      <div className="App">
        <Title></Title>
        <Register cpu={this.core} frame={{
          top: 55 + 'px',
          width: this.state.frame.width * 0.4 + 'px',
          height: 200 + 'px',
          left: 0
        }}/>
        <Memory cpu={this.core} frame={{
          top: 55 + 200 + 'px',
          width: this.state.frame.width * 0.4 + 'px',
          height: this.state.frame.height - 250 + 'px',
          bottom: 0,
          left: 0
        }}/>
        <Debug cpu={this.core} frame={{
          top: 55 + 'px',
          width: this.state.frame.width * 0.6 + 'px',
          height: 75 + 'px',
          left: this.state.frame.width * 0.4 + 'px'
        }}/>
        <Codelist cpu={this.core} frame={{
          top: 130 + 'px',
          width: this.state.frame.width * 0.3 + 'px',
          height: this.state.frame.height - 130 + 'px',
          left: this.state.frame.width * 0.7 + 'px'
        }}/>
      </div>
    );
  }
}

export default App;
