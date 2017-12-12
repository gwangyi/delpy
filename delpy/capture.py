import sys
import contextlib
import typing
from IPython import get_ipython
from IPython.core.displaypub import CapturingDisplayPublisher
from IPython.core.displayhook import CapturingDisplayHook


class _CaptureWriter:
    def __init__(self, name: str, outputs: typing.List[typing.Dict[str, typing.Any]]) -> None:
        self.name = name
        self.outputs = outputs

    def write(self, txt: str) -> None:
        self.outputs.append({'output_type': 'stream', 'name': self.name, 'text': txt})

    def flush(self) -> None:
        pass


class _CaptureOutputs(list):
    def append(self, msg: typing.Any) -> None:
        if isinstance(msg, typing.Sequence):
            msg = {
                'output_type': 'display_data',
                'data': msg[0],
                'metadata': msg[1]
            }
        super().append(msg)


@contextlib.contextmanager
def capture_output(stdout: bool=True, stderr: bool=True, display: bool=True) -> typing.Iterable[typing.Sequence[typing.Dict[str, typing.Any]]]:
    _stdout = sys.stdout
    _stderr = sys.stderr
    _display_hook = sys.displayhook
    shell = get_ipython()
    _display_pub = shell.display_pub if shell else None

    outputs = _CaptureOutputs()
    try:
        if stdout:
            sys.stdout = _CaptureWriter('stdout', outputs)
        if stderr:
            sys.stderr = _CaptureWriter('stderr', outputs)
        if display and shell:
            shell.display_pub = CapturingDisplayPublisher()
            shell.display_pub.outputs = outputs
            sys.displayhook = CapturingDisplayHook(shell, outputs)

        yield outputs
    finally:
        sys.stdout = _stdout
        sys.stderr = _stderr
        sys.displayhook = _display_hook
        if shell:
            shell.display_pub = _display_pub
