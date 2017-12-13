define(function(require) {
  var Blockly = require('blockly');
  require('blockly/code/python');

  function delpy_procedure(block) {
    var args = [];

    for(idx in block.args) {
      var arg = block.args[idx];
      args.push(arg + "=" + Blockly.Python.valueToCode(block, arg));
    }
    return "self." + block.getFieldValue("NAME") + "(" + args.join(",") + ")";
  }

  Blockly.Python.delpy_procedure = function (block) {
    return delpy_procedure(block) + "\n";
  }

  Blockly.Python.delpy_procedure_ret = function (block) {
    return [delpy_procedure(block), Blockly.Python.ORDER_FUNCTION_CALL];
  }

  Blockly.Python.INDENT = "    ";

  return Blockly;
});
