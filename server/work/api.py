import json
import cherrypy

from .model import WorkService

sevices = WorkService()

class WorkV2Rest:
    pass


import inspect

methods = inspect.getmembers(WorkService, predicate=inspect.isfunction)
user_defined_methods = [name for name, _ in methods if not str(name).startswith('_')]

def add_endpoint(cls, method):
    @cherrypy.expose
    @cherrypy.tools.json_in()
    @cherrypy.tools.json_out()
    def endpointFunc(self):
        check_pass = cherrypy.request.ep_data['check_pass'] if 'check_pass' in cherrypy.request.ep_data else None
        if not check_pass:
            data = ('ia', 'invalid access')
            return json.dumps({'endpoint':str(method), 'data':data})

        params = cherrypy.request.json or {}

        objMethod = getattr(sevices, method, None)
        objMethod_signature = inspect.signature(objMethod)
        # print(objMethod_signature)
        objMethod_params = { f for f in objMethod_signature.parameters}
        # print(objMethod_params)
        filtered_params = {k: v for k, v in params.items() if k in objMethod_params}
        # print(filtered_params)
        data = objMethod(**filtered_params)
        return json.dumps({'endpoint':str(method), 'data': data})
    endpointFunc.__name__=str(method)
    setattr(cls, endpointFunc.__name__, classmethod(endpointFunc))

for method in user_defined_methods:
    print(method)
    add_endpoint(WorkV2Rest, method)