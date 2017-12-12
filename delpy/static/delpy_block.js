define(function(require) {
  var Blockly = require('blockly');

  Blockly.Blocks['delpy_procedure'] = {
    init: function() {
      this.appendDummyInput().appendField(this.id, "NAME");
      this.setColour(Blockly.Blocks.procedures.HUE);
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setTooltip("Delpy Function");
    },
    mutationToDom: function() {
      var name = this.getFieldValue("NAME");
      var $mutation = $('<mutation/>').attr("name", name);

      return $mutation[0];
    },
    domToMutation: function(mutation) {
      var name = $(mutation).attr("name");
      var signature = this.workspace.delpy.procedures && this.workspace.delpy.procedures[name];
      this.setFieldValue($(mutation).attr("name"), "NAME");
      var args = [];
      if(signature) {
        this.setTooltip(signature.doc || "");
        for(idx in signature.args) {
          var pair = signature.args[idx];
          var arg = pair[0], check = pair[1];
          this.appendValueInput(arg)
              .setCheck(check)
              .appendField(arg);
          args.push(arg);
        }
      }
      this.args = args;
    }
  }

  Blockly.Blocks['delpy_procedure_ret'] = {
    init: function() {
      this.appendDummyInput().appendField(this.id, "NAME");
      this.setColour(Blockly.Blocks.procedures.HUE);
      this.setOutput(true, null);
      this.setTooltip("Delpy Function with Return Value");
    },
    mutationToDom: Blockly.Blocks.delpy_procedure.mutationToDom,
    domToMutation: Blockly.Blocks.delpy_procedure.domToMutation
  }

  return Blockly;
});
