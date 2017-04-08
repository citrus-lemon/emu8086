import React, { Component } from 'react';
import './App.css';
import { Register, Memory, Stack } from './Component';
import { Debug, Codelist, Screen } from './Control';
import {Title} from './Title';
import {debug as core} from './concatenated.js';

class App extends Component {
  constructor(props) {
    super(props)
    this.core = new core()
    top.cpu = this.core
    this.refresh = (opt) => {
      opt = opt || {}
      let {code, update} = opt
      this.update = update
      if (code) {
        this.core.codename = code.name
        this.core.load(code.code)
        this.core.event('init')()
        this.setState({current: this.steptimes})
      }
      else if (this.core.codename) {
        this.setState({current: this.steptimes})
      }
    }
    top.screen = ''
    this.core.onevent('int',(s,c) => {
      switch (c) {
        case 33:
          top.screen += String.fromCharCode(this.core.register("DL"))
          break;

        default:
          break;
      }
    })
    this.core.onevent('init',(s) => {
      top.screen = ''
    })
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
        <Register cpu={this.core} update={this.update} frame={{
          top: 55 + 'px',
          width: this.state.frame.width * 0.4 + 'px',
          height: 200 + 'px',
          left: 0
        }}/>
        <Memory cpu={this.core} update={this.update} frame={{
          top: 55 + 200 + 'px',
          width: this.state.frame.width * 0.4 + 'px',
          height: this.state.frame.height - 250 + 'px',
          bottom: 0,
          left: 0
        }}/>
        <Stack cpu={this.core} frame={{
          top: 130 + 'px',
          width: this.state.frame.width * 0.3 + 'px',
          height: 30 + 'px',
          left: this.state.frame.width * 0.4 + 'px'
        }}></Stack>
        <Debug cpu={this.core} refresh={this.refresh} frame={{
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
        <Screen cpu={this.core} content={top.screen} frame={{
          top: 130 + 'px',
          width: this.state.frame.width * 0.3 + 'px',
          height: this.state.frame.height - 160 + 'px',
          left: this.state.frame.width * 0.4 + 'px'
        }}></Screen>
      </div>
    );
  }
}

export default App;
