import React, { Component } from 'react';
import './App.css';
import { Register, Memory } from './Component';
import {CPU as core} from './concatenated.js';

class App extends Component {
  constructor(props) {
    super(props)
    this.core = new core()
  }

  render() {
    return (
      <div className="App">
        <Register cpu={this.core}/>
        <Memory />
      </div>
    );
  }
}

export default App;
