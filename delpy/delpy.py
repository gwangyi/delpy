import typing
import json
import html
import inspect
import contextlib
from IPython import get_ipython
from IPython.display import display
from ipykernel.comm.comm import Comm
from ipykernel.comm.manager import CommManager
from pkg_resources import resource_string
from xml.etree import ElementTree as ET

from .capture import capture_output


_T = typing.TypeVar('_T')


class Delpy:
    _delpy_holder: typing.Dict[int, 'Delpy'] = dict()
    _procedures: typing.Dict[str, typing.Any] = dict()

    @classmethod
    def __init_subclass__(cls, *args: typing.Any, **kwargs: typing.Any) -> None:
        cls._procedures = dict((k, v) for base in cls.__bases__ for k, v in base._procedures)

        for k, v in cls.__dict__.items():
            if isinstance(v, typing.Callable):
                sig = inspect.signature(v)
                parameters = list(sig.parameters.keys())
                cls._procedures[k] = {
                    'args': [(k, None) for k in parameters[1:]],
                    'ret': None,
                    'doc': v.__doc__,
                    'category': str(getattr(v, '_delpy'))
                }

    def __init__(self, **kwargs: typing.Any) -> None:
        self._parameters: str = html.escape(json.dumps(kwargs))
        self.toolbox = ET.fromstring(resource_string(__package__, '_toolbox.xml'))
        self._delpy_holder[id(self)] = self
        self.workspace = ''
        self._comm: typing.Set[Comm] = set()

    def _on_msg(self, msg: typing.Dict[str, typing.Any]) -> None:
        data = msg['content']['data']
        if 'cmd' not in data or 'id' not in data:
            return

        def result(**kwargs: typing.Any) -> None:
            kwargs['id'] = id(self)
            for comm in self._comm:
                comm.send(kwargs)

        if data['cmd'] == 'get_workspace':
            result(cmd='set_workspace', body=self.workspace)
        elif data['cmd'] == 'set_workspace':
            self.__dict__['workspace'] = data['body']
            result(cmd='set_workspace', body=self.workspace)
        elif data['cmd'] == 'procedure':
            outputs = None
            with capture_output() as c:
                _append = c.append

                def append(target):
                    _append(target)
                    result(cmd='procedure', output=c[-1])
                c.append = append
                ret = getattr(self, data['name'], lambda **_: None)(**data.get('args', {}))
            result(cmd='procedure', ret=json.dumps(ret))

    @staticmethod
    def _comm_target(comm: Comm, msg: typing.Dict[str, typing.Any]) -> None:
        self = Delpy._delpy_holder[msg['content']['data']['id']]
        self._comm.add(comm)
        comm.on_msg(self._on_msg)

        @comm.on_close
        def on_close(msg: typing.Dict[str, typing.Any]):
            self._comm.remove(comm)

    @staticmethod
    def get(delpy_id: int) -> 'Delpy':
        return Delpy._delpy_holder[delpy_id]

    def _repr_html_(self) -> str:
        return ''.join([
            '<div class="delpy-place" data-delpy-id="', str(id(self)), '">'
            '<div class="delpy-workspace">',
            self.workspace,
            '</div>'
            '<span class="delpy-procedures" style="display: none">',
            html.escape(json.dumps(self._procedures)),
            '</span>'
            '<span class="delpy-parameters" style="display: none">',
            html.escape(self._parameters),
            '</span>',
            ET.tostring(self.toolbox).decode('utf-8'),
            '<script>',
            r'''
            new Promise(function(resolve, reject) {
                requirejs(["nbextensions/delpy/index"], resolve, reject);
            }).then(function(delpy) {
                delpy.inject_blockly();
            });
            '''
            '</script></div>'
        ])


def delpy_method(tag: str="Delpy") -> typing.Callable[[_T], _T]:
    def decorator(fn: _T) -> _T:
        setattr(fn, '_delpy', tag)
        return fn

    return decorator


if get_ipython():
    get_ipython().kernel.comm_manager.register_target('delpy', Delpy._comm_target)
