(function(){
  const win = window;
  if (typeof win === 'undefined') return;
  if (win.__mockHostPatched__) return;
  win.__mockHostPatched__ = true;
  win.__mockNavigate = function(path) {
    if (parent && parent.postMessage) {
      parent.postMessage({ type: 'mock:navigate', payload: path }, '*');
    }
  };
})();
