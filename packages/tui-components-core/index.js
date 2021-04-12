export { Box }            from './core/box'
export { Element }        from './core/element'
export { Node }           from './core/node'
export { Screen }         from './core/screen'
export { Log }            from './src/log'
export { ScrollableBox }  from './src/scrollablebox'
export { ScrollableText } from './src/scrollabletext'
// export { Layout }  from './src/layout'
// export { Line }  from './src/line'
// export { Terminal }  from './src/terminal'

export class TUIComponentsCore {
  static _screen
  static _element
  static get Screen() {
    if (!TUIComponentsCore._screen) TUIComponentsCore._screen = Screen
    return TUIComponentsCore._screen
  }
  static get Element() {
    if (!TUIComponentsCore._element) TUIComponentsCore._element = Element
    return TUIComponentsCore._element
  }
}