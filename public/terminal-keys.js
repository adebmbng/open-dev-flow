// Forward Shift+Enter as a distinct terminal key, leaving other keys to xterm.
function installAgentKeybindings(terminal, send) {
  terminal.attachCustomKeyEventHandler(event => {
    if (event.key !== 'Enter' || !event.shiftKey || event.ctrlKey || event.altKey || event.metaKey || event.isComposing) return true;
    if (event.type === 'keydown') {
      event.preventDefault();
      send('\x1b[13;2u');
    }
    return false;
  });
}
if (typeof module !== 'undefined') module.exports = { installAgentKeybindings };
