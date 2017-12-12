define(function(require) {
  var Blockly = require('blockly');
  var acorn = require('acorn_interpreter');
  window.acorn = acorn; // Interpreter uses acorn as a global object...
  require('./delpy_javascript');

  function Runner(delpy) {
    var comm = Jupyter.notebook.kernel.comm_manager.new_comm('delpy', { 'id': delpy.delpy_id});
    var thisRunner = this;

    function initApi(interpreter, scope) {
      interpreter.setProperty(scope, 'alert',
        interpreter.createNativeFunction(function(text) {
          print(text ? text.toString() : '');
        }));

      var wrapper = function(id) {
        id = id ? id.toString() : '';
        return interpreter.createPrimitive(highlightBlock(id));
      };
      interpreter.setProperty(scope, 'highlightBlock',
        interpreter.createNativeFunction(wrapper));

      var wrapper = interpreter.createAsyncFunction(function(fn, args, callback) {
        delpy_rpc(fn ? fn.toString() : '', interpreter.pseudoToNative(args), function(ret) {
          callback(interpreter.createPrimitive(ret));
        });
      });
      interpreter.setProperty(scope, 'delpy', wrapper);
    }

    var highlightPause = false;
    var latestCode = '';
    var myInterpreter = null;
    var asyncBusy = false;

    function print(text) {
      delpy.output_area.append_output({output_type: "stream", text: text + "\n", name: "output"});
    }

    var busy_func = null;

    function delpy_rpc(fn, args, callback) {
      asyncBusy = true;
      comm.on_msg(function(msg) {
        if(msg.content.data.cmd == 'procedure') {
          if(msg.content.data.output) {
            delpy.output_area.append_output(msg.content.data.output);
          }
          if(msg.content.data.ret) {
            comm.on_msg(undefined)
            asyncBusy = false;
            if(busy_func) busy_func(false);
            callback(JSON.parse(msg.content.data.ret));
          }
        }
      });
      comm.send({'cmd': 'procedure', 'name': fn, 'args': args, 'id': delpy.delpy_id});
    }

    function highlightBlock(id) {
      delpy.workspace.highlightBlock(id);
      highlightPause = true;
    }

    function resetStepUi(clearOutput) {
      delpy.workspace.highlightBlock(null);
      highlightPause = false;
    }

    function generateCodeAndLoadIntoInterpreter() {
      Blockly.JavaScript.STATEMENT_PREFIX = 'highlightBlock(%1);\n';
      Blockly.JavaScript.addReservedWords('highlightBlock');
      latestCode = Blockly.JavaScript.workspaceToCode(delpy.workspace);
      resetStepUi(true);
    }

    function stepCode(busy) {
      if(!myInterpreter) {
        resetStepUi(true);
        myInterpreter = new Interpreter(latestCode, initApi);
        setTimeout(function () {
          highlightPause = false;
          stepCode(busy);
        }, 1);
        return true;
      }

      busy_func = busy;

      highlightPause = false;
      busy(true);
      do {
        try {
          var hasMoreCode = myInterpreter.step();
        } finally {
          if (!hasMoreCode) {
            busy(false);
            myInterpreter = null;
            resetStepUi(false);
            return false;
          }
        }
      } while(hasMoreCode && !highlightPause && !asyncBusy);
      busy(asyncBusy);

      return true;
    }

    generateCodeAndLoadIntoInterpreter();
    delpy.workspace.addChangeListener(function(event) {
      if(!(event instanceof Blockly.Events.Ui)) {
        generateCodeAndLoadIntoInterpreter();
      }
    });

    this.stepCode = stepCode;
    this.reset = generateCodeAndLoadIntoInterpreter;
  }

  return Runner;
});
