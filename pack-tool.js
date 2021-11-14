const fs = require('fs')
const path = require('path')
const parser = require('@babel/parser')
const traverse = require('@babel/traverse').default
const babel = require('@babel/core')

// 获取项目目录路径
const root = process.cwd()
main()

function main(entry = './src/index.js', output = './dist.js') {
  fs.writeFileSync(output, pack(buildDependencyGraph(entry), entry))
}

function readModuleInfo(filePath) {
  // 准备好相对路径作为 module 的 key
  filePath = './' + path.relative(root, path.resolve(filePath)).replace(/\\+/g, '/')
  // 读取源码
  const content = fs.readFileSync(filePath, 'utf-8')
  // 转换出AST
  const ast = parser.parse(content)
  // 遍历 ast ，将依赖收集到数组中
  const deps = []

  traverse(ast, {
    CallExpression: ({ node }) => {
      // 如果是 require 语句，则收集依赖
      if (node.callee.name === 'require') {
        // 改造 require 关键字
        node.callee.name = '_require_'
        let moduleName = node.arguments[0].value
        moduleName += path.extname(moduleName) ? '' : '.js'
        moduleName = path.join(path.dirname(filePath), moduleName)
        moduleName = './' + path.relative(root, moduleName).replace(/\\+/g, '/')
        deps.push(moduleName)
        //改造转换路径
        node.arguments[0].value = moduleName
      }
    }
  })

  const { code } = babel.transformFromAstSync(ast)
  return {
    filePath,
    deps,
    code
  }
}


function buildDependencyGraph(entry) {
  // 获取入口模块信息
  const entryInfo = readModuleInfo(entry)
  // 项目依赖树
  const graphArr = []
  graphArr.push(entryInfo)
  // 从入口模块触发，递归遍历每个模块的依赖，并将每个模块信息保存到graphArr
  for (const module of graphArr) {
    module.deps.forEach((depPath) => {
      const moduleInfo = readModuleInfo(path.resolve(depPath))
      graphArr.push(moduleInfo)
    })
  }

  return graphArr
}


function pack(graph, entry) {
  const moduleArr = graph.map(module => {
    return (
      `"${module.filePath}": function(module, exports, _require_) {
        eval(\`` + module.code + `\`)
      }`
    )
  })

  const output = `;(() => {
    var modules = {
      ${moduleArr.join(',\n')}
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

    _require_('${entry}')
  })()`

  return output
}


