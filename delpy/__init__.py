from .delpy import *


def _jupyter_nbextension_paths():
    return [dict(
        section="notebook",
        src="static",
        dest="delpy",
        require="delpy/index")]
