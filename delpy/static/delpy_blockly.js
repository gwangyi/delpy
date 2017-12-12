define(function(require) {
  var $ = require('jquery');
  var Blockly = require('blockly');
  var Jupyter = require('base/js/namespace');
  var outputarea = require('notebook/js/outputarea');

  require('blockly/blocks');
  require('blockly/code/python');
  require('blockly/msg');
  require('blockly/code/msg');

  require('./delpy_block')
  require('./delpy_python')

  var Runner = require('./run');

  // Add style sheets
  $('<link rel="stylesheet" href="//cdnjs.cloudflare.com/ajax/libs/highlight.js/9.12.0/styles/default.min.css"/>').appendTo($('head'));
  $('<style type="text/css">\n' +
    '.delpy-place .delpy-workspace {\n' +
    '  height: 480px;\n' +
    '  width: 100%;\n' +
    '}\n' +
    '.delpy-place button {\n' +
    '  margin: 1em;\n' +
    '}\n' +
    '</script>').appendTo($('head'));

  function Delpy(elem) {
    var $elem = $(elem);
    var thisDelpy = this;
    this.delpy_id = parseInt($elem.data('delpy-id'));

    // Prepare Blockly workspace
    var toolboxText = $elem.find('xml.toolbox').wrapAll('<div/>').parent().html();
    toolboxText = toolboxText.replace(/(^|[^%]){(\w+)}/g,
      function(m, p1, p2) { return p1 + Blockly.Msg[p2]; });
    var toolbox = Blockly.Xml.textToDom(toolboxText);
    var workspace = elem.getElementsByClassName('delpy-workspace')[0];
    var parameters = JSON.parse($('.delpy-parameters', elem).text());
    var procedures = JSON.parse($('.delpy-procedures', elem).text());
    this.procedures = procedures;

    $(toolbox).append($('<sep/>'));
    var delpy_categories = $.unique($.map(procedures, function(prop, key) {
      return prop.category;
    }));
    $(delpy_categories).each(function(i, cat) {
      $(toolbox).append($('<category name="' + cat + '" colour="' + Blockly.Blocks.procedures.HUE + '" custom="DELPY-' + i + '"/>'));
    })
    parameters.toolbox = toolbox;

    var code = $(workspace).html();

    function inject(code) {
      $(workspace).html('');

      var workspacePlayground = Blockly.inject(workspace, parameters);
      thisDelpy.workspace = workspacePlayground;
      var dom = Blockly.Xml.textToDom(code);
      Blockly.Xml.domToWorkspace(dom, workspacePlayground);

      $(delpy_categories).each(function(i, cat) {
        workspacePlayground.registerToolboxCategoryCallback("DELPY-" + i, function() {
          var rets = [];
          for(fn in procedures) {
            if(procedures[fn].category == cat) {
              xml = '<block type="delpy_procedure"><field name="NAME">' + fn + '</field></block>';
              rets.push($(xml)[0])
              xml = '<block type="delpy_procedure_ret"><field name="NAME">' + fn + '</field></block>';
              rets.push($(xml)[0])
            }
          }
          return rets;
        });
      });
    }

    inject(code);
    alert(code);

    this.reinject = function() { inject(thisDelpy.get_workspace()); }

    var comm = Jupyter.notebook.kernel.comm_manager.new_comm('delpy', {'id': this.delpy_id});
    comm.on_msg(function(msg) {
      var data = msg.content.data;
      if(data.cmd == 'set_workspace') {
        thisDelpy.update_workspace(data.body);
      }
    });

    // Take Jupyter notebook cell
    var $cell_elem = $elem.closest('.code_cell');
    var cell = $(Jupyter.notebook.get_cells()).filter(function(index) {
      return this.element[0] === $cell_elem[0];
    })[0];

    this.cell = cell;

    $elem.find('.delpy-btns').remove();
    var $btns = $('<div/>').addClass('delpy-btns').appendTo($elem)
    // Prepare phereperal widgets
    $('<button/>').text("Generate Python Code")
      .addClass('btn').appendTo($btns)
      .click(function() {
        var cell_ = Jupyter.notebook.insert_cell_below('code');
        cell_.set_text(thisDelpy.generate_python_code());
      });

    $('<button/>').text("Save")
      .addClass('btn').appendTo($btns)
      .click(function() {
        var txt = thisDelpy.get_workspace();

        comm.send({'cmd': 'set_workspace', 'body': txt, 'id': thisDelpy.delpy_id});
      });

    var runner = new Runner(this);

    function busy_handler(busy) {
      $(stepBtn).prop('disabled', busy);
      $(runBtn).prop('disabled', busy);
    }

    var stepBtn = $('<button/>').text("Step")
      .addClass('btn').appendTo($btns)
      .click(function() {
        runner.stepCode(busy_handler);
      });
    $('<button/>').text("Reset")
      .addClass('btn').appendTo($btns)
      .click(function() {
        runner.reset();
      });
    var runBtn = $('<button/>').text("Run")
      .addClass('btn').appendTo($btns)
      .click(function() {
        function goThrough() {
          if(runner.stepCode(busy_handler))
            setTimeout(goThrough, 100);
        }
        goThrough();
      });
    $('<button/>').text("Clear output")
      .addClass('btn').appendTo($btns)
      .click(function() {
        thisDelpy.output_area.clear_output();
      });

    var output_area_holder = $('<div/>').appendTo($btns);
    this.output_area = new outputarea.OutputArea({
      selector: output_area_holder,
      config: {data: {OutputArea: {}}},
      prompt_area: false,
      events: Jupyter.notebook.events,
      keyboard_manager: Jupyter.notebook.keyboard_manager
    });
  }

  Delpy.prototype = {
    get_workspace: function() {
      var dom = Blockly.Xml.workspaceToDom(this.workspace);
      var txt = Blockly.Xml.domToText(dom);

      return txt;
    },
    update_workspace: function (txt) {
      var cell = this.cell;
      var delpy_id = this.delpy_id;
      for(var idx = 0; idx < cell.output_area.outputs.length; idx++) {
        var output = cell.output_area.outputs[idx];
        var $widget = $('<div/>').append($(output.data['text/html']))
        var $workspace = $widget.find('.delpy-place[data-delpy-id="' + delpy_id + '"] .delpy-workspace');
        if($workspace.length > 0) {
          $workspace.html(txt);
          this.workspace.clear();
          var dom = Blockly.Xml.textToDom(txt);
          Blockly.Xml.domToWorkspace(dom, this.workspace);
          output.data['text/html'] = $widget.html();
        }
      }
    },
    generate_python_code: function() {
      var code = Blockly.Python.workspaceToCode(this.workspace);
      var prepare = [
        "from delpy import Delpy",
        "",
        "",
        "self = Delpy.get(" + this.delpy_id + ")",
        "",
        "",
      ];
      return prepare.join("\n") + code;
    }
  };

  // Inject Blockly workspace
  function inject_blockly(reinject) {
    var places = document.getElementsByClassName('delpy-place');
    for(var idx = 0; idx < places.length; idx += 1) {
      var elem = places[idx];
      var $elem = $(elem);
      if(!$elem.hasClass('delpy-injected')) {
        $elem.addClass('delpy-injected');

        elem.delpy = new Delpy(elem);
      } else if(reinject) {
        elem.delpy.reinject();
      }
    }
    $('.blocklyWidgetDiv:not(.delpy)').addClass('delpy')
      .keypress(function(e) { e.stopPropagation(); })
      .keyup(function(e) { e.stopPropagation(); })
      .keydown(function(e) { e.stopPropagation(); });
  }

  return { inject_blockly: inject_blockly };
});

