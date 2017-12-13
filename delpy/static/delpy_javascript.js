define(function(require) {
  var Blockly = require('blockly');
  require('blockly/code/javascript');

  function delpy_procedure(block) {
    var args = [];

    for(idx in block.args) {
      var arg = block.args[idx];
      args.push(arg + ": " + Blockly.JavaScript.valueToCode(block, arg))
    }
    return 'delpy("' + block.getFieldValue("NAME") + '", {' + args.join(",") + "})";
  }

  Blockly.JavaScript.delpy_procedure = function (block) {
    return delpy_procedure(block) + ";\n";
  }

  Blockly.JavaScript.delpy_procedure_ret = function (block) {
    return [delpy_procedure(block), Blockly.JavaScript.ORDER_FUNCTION_CALL]
  }

  return Blockly;
});

