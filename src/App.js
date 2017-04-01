import React, { Component } from 'react';
import './App.css';
import { Register, Memory } from './Component';
import {Title} from './Title';
import {CPU as core} from './concatenated.js';

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
          top: 50 + 'px',
          width: this.state.frame.width * 0.4 + 'px',
          height: 200 + 'px',
          left: 0
        }}/>
        <Memory cpu={this.core} frame={{
          top: 50 + 200 + 'px',
          width: this.state.frame.width * 0.4 + 'px',
          bottom: 0,
          left: 0
        }}/>
      </div>
    );
  }
}

export default App;
