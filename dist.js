;(() => {
    var modules = {
      "./src/index.js": function(module, exports, _require_) {
        eval(`const printA = _require_("./src/a.js");

printA();`)
      },
"./src/a.js": function(module, exports, _require_) {
        eval(`module.exports = function printA() {
  function test() {
    console.log('this is something test');
  }

  test();
};`)
      }
    }
    var modules_cache = {}
    var _require_ = function(moduleId) {
      if(modules_cache[moduleId]) return modules_cache[moduleId].expors
      var module = modules_cache[moduleId] = {
        exports: {}
      }
      modules[moduleId](module, module.exports, _require_)
      return module.exports
    }

    _require_('./src/index.js')
  })()