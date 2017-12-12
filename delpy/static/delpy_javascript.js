define(function(require) {
  var Blockly = require('blockly');
  require('blockly/code/javascript');

  Blockly.JavaScript.delpy_procedure = function (block) {
    var args = [];

    for(idx in block.args) {
      var arg = block.args[idx];
      args.push(arg + ": " + Blockly.JavaScript.valueToCode(block, arg))
    }
    return 'delpy("' + block.getFieldValue("NAME") + '", {' + args.join(",") + "});\n"
  }

  Blockly.JavaScript.delpy_procedure_ret = function (block) {
    return [Blockly.JavaScript.delpy_procedure(block), Blockly.JavaScript.ORDER_FUNCTION_CALL]
  }

  return Blockly;
});

