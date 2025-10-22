import os

# path = os.path.abspath(os.getcwd())
path = os.path.dirname(os.path.abspath('requirements.txt'))
config = {
    'global': {
        'server.socket_host': '127.0.0.1',
        'server.socket_port': 3000,
        'server.thread_pool': 100,
    },
    '/': {
        'tools.staticdir.root': path,
        'tools.staticdir.on': True,
        'tools.staticdir.dir': os.path.join(path, 'client')
    },
}
