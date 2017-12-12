# Delpy

Blockly on Jupyter Notebook with Python

## Installation

```bash
pip install delpy
jupyter nbextension install delpy --py --sys-prefix
jupyter nbextension enable delpy --py --sys-prefix
```

For developer:

```bash
git clone https://github.com/gwangyi/delpy
cd delpy
pip install -e .
jupyter nbextension install delpy --py --sys-prefix --symlink
jupyter nbextension enable delpy --py
```

## Example

```python
from delpy import Delpy, delpy_method


class MyDelpy(Delpy):
    @delpy_method("Category1")
    def hi(self):
        print("Hello!")

    @delpy_method("Category2")
    def hello(self, msg):
        print("Hello, ", msg, "!")

p = MyDelpy()
p
```
