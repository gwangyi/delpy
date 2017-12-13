from setuptools import setup


setup(
        name="delpy",
        version="2017.12.12a0.dev3",
        packages=["delpy"],
        package_data={'delpy': ['*.xml', 'static/*']},
        url='https://github.com/gwangyi/delpy',
        license='MIT',
        author='Sungkwang Lee',
        author_email='gwangyi.kr@gmail.com',
        description='Blockly w/ Python on Jupyter Notebook',
        classifiers=[
            'Development Status :: 3 - Alpha',
            'Programming Language :: Python :: 3',
            'Programming Language :: Python :: 3.6',
        ],
        install_requires=['jupyter']
)
