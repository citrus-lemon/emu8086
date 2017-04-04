const flag_name = {
      CF: 0,
      PF: 2,
      AF: 4,
      ZF: 6,
      SF: 7,
      TF: 8,
      IF: 9,
      DF: 10,
      OF: 11,
    }
const reg_tab = [
        ["AL","CL","DL","BL","AH","CH","DH","BH"],
        ["AX","CX","DX","BX","SP","BP","SI","DI"]
      ]
const reg_seg = ["ES","CS","SS","DS"]
const rm_tab = [
        ["BX","SI"],
        ["BX","DI"],
        ["BP","SI"],
        ["BP","DI"],
        ["SI"],
        ["DI"],
        ["BP"],
        ["BX"],
      ]
const w_tag = ["byte","word"]

class Element {
  constructor(str, word, me) {

  }
}

class SingletonCode {

}

module.exports = {Element, SingletonCode}
